import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import { funnel } from "remeda";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const SAVE_DEBOUNCE_MS = 500;

interface UserInfo {
  userId: string;
  userName: string;
  userColor: string;
}

interface WebSocketWithUser extends WebSocket {
  userInfo?: UserInfo;
  clientId?: number;
}

/**
 * PageCollabDO - Yjs collaboration for page editor with multiple fragments.
 *
 * Supports multiple named Y.XmlFragment fields per document:
 * - `title` - page title
 * - `block:{blockId}:question` - each block's question
 * - `block:{blockId}:answer` - each block's answer
 *
 * Uses the same sync/awareness protocol as SimpleCollabDO.
 */
export class PageCollabDO implements DurableObject {
  private state: DurableObjectState;
  private doc: Y.Doc;
  private awareness: awarenessProtocol.Awareness;
  private connections: Set<WebSocketWithUser> = new Set();
  private debouncedSave = funnel(() => this.saveToStorage(), {
    minQuietPeriodMs: SAVE_DEBOUNCE_MS,
  });

  constructor(state: DurableObjectState) {
    this.state = state;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    this.doc.on("update", (update, origin) => {
      this.debouncedSave.call();
      this.broadcastDocUpdate(update, origin as WebSocketWithUser | null);
    });

    this.awareness.on(
      "update",
      ({
        added,
        updated,
        removed,
      }: {
        added: number[];
        updated: number[];
        removed: number[];
      }) => {
        const changedClients = added.concat(updated).concat(removed);
        this.broadcastAwarenessUpdate(changedClients);
      },
    );

    (
      this.state as unknown as { blockConcurrencyByDefault?: () => void }
    ).blockConcurrencyByDefault?.();
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }

    if (request.method === "GET") {
      return new Response("ok", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userInfo: UserInfo = {
      userId: url.searchParams.get("userId") || "anonymous",
      userName: url.searchParams.get("userName") || "Anonymous",
      userColor: url.searchParams.get("userColor") || "#808080",
    };

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    const ws = server as WebSocketWithUser;
    ws.userInfo = userInfo;
    ws.clientId = Math.floor(Math.random() * 2147483647);

    this.state.acceptWebSocket(server);

    if (this.connections.size === 0) {
      await this.loadFromStorage();
    }

    this.connections.add(ws);
    this.sendInitialSync(ws);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async loadFromStorage(): Promise<void> {
    const storedState = await this.state.storage.get<Uint8Array>("yjs-state");
    if (storedState) {
      Y.applyUpdate(this.doc, new Uint8Array(storedState));
    }
  }

  private async saveToStorage(): Promise<void> {
    const state = Y.encodeStateAsUpdate(this.doc);
    await this.state.storage.put("yjs-state", state);
  }

  private sendInitialSync(ws: WebSocketWithUser): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    ws.send(encoding.toUint8Array(encoder));

    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(
        this.awareness,
        Array.from(this.awareness.getStates().keys()),
      ),
    );
    ws.send(encoding.toUint8Array(awarenessEncoder));
  }

  webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): void {
    if (typeof message === "string") return;

    const data = new Uint8Array(message);
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC:
        this.handleSyncMessage(ws as WebSocketWithUser, decoder);
        break;
      case MESSAGE_AWARENESS:
        this.handleAwarenessMessage(ws as WebSocketWithUser, decoder);
        break;
      default:
        break;
    }
  }

  private handleSyncMessage(
    ws: WebSocketWithUser,
    decoder: decoding.Decoder,
  ): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);

    syncProtocol.readSyncMessage(decoder, encoder, this.doc, ws);

    if (encoding.length(encoder) > 1) {
      ws.send(encoding.toUint8Array(encoder));
    }
  }

  private handleAwarenessMessage(
    ws: WebSocketWithUser,
    decoder: decoding.Decoder,
  ): void {
    const update = decoding.readVarUint8Array(decoder);
    awarenessProtocol.applyAwarenessUpdate(this.awareness, update, ws);
  }

  private broadcastDocUpdate(
    update: Uint8Array,
    origin: WebSocketWithUser | null,
  ): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    this.broadcast(message, origin ?? undefined);
  }

  private broadcastAwarenessUpdate(changedClients: number[]): void {
    if (changedClients.length === 0) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
    );
    const message = encoding.toUint8Array(encoder);

    this.broadcast(message);
  }

  private broadcast(message: Uint8Array, except?: WebSocketWithUser): void {
    for (const ws of this.connections) {
      if (ws !== except && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  webSocketClose(ws: WebSocket): void {
    this.connections.delete(ws as WebSocketWithUser);
    const wsWithUser = ws as WebSocketWithUser;
    if (wsWithUser.clientId !== undefined) {
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        [wsWithUser.clientId],
        "disconnect",
      );
    }

    if (this.connections.size === 0) {
      this.debouncedSave.call();
    }
  }

  webSocketError(ws: WebSocket): void {
    this.webSocketClose(ws);
  }
}
