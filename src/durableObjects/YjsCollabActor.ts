import { Actor } from "@cloudflare/actors";
import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import { funnel } from "remeda";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const SAVE_DEBOUNCE_MS = 500;

/**
 * Base class for Yjs collaboration Durable Objects using the Cloudflare Actors library.
 *
 * Handles WebSocket connections, Yjs sync/awareness protocol, and state persistence.
 * Subclasses only need to configure document-specific behavior (e.g., shared types).
 */
export abstract class YjsCollabActor extends Actor<Env> {
  protected doc = new Y.Doc();
  protected awareness = new awarenessProtocol.Awareness(this.doc);
  private connectionMeta = new Map<WebSocket, number>(); // ws -> clientId
  private debouncedSave = funnel(() => this.saveToStorage(), {
    minQuietPeriodMs: SAVE_DEBOUNCE_MS,
  });

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      await this.loadFromStorage();
      this.setupDocListeners();
    });
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }
    return this.handleHttp(request);
  }

  protected async handleHttp(request: Request): Promise<Response> {
    if (request.method === "GET") {
      return new Response("ok", { status: 200 });
    }
    return new Response("Not found", { status: 404 });
  }

  /**
   * Reset all collaboration state. Closes connections, destroys the Y.Doc,
   * re-creates it with fresh listeners, and clears persisted state.
   */
  protected async resetState(): Promise<void> {
    for (const ws of this.ctx.getWebSockets()) {
      ws.close(1000, "State cleared");
    }
    this.connectionMeta.clear();

    this.doc.destroy();
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.setupDocListeners();

    await this.ctx.storage.delete("yjs-state");
  }

  // --- WebSocket lifecycle (Durable Object hibernation API) ---

  private handleWebSocket(request: Request): Response {
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    this.ctx.acceptWebSocket(server);
    this.connectionMeta.set(
      server,
      Math.floor(Math.random() * 2147483647),
    );
    this.sendInitialSync(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(
    ws: WebSocket,
    message: ArrayBuffer | string,
  ): Promise<void> {
    if (typeof message === "string") return;

    const data = new Uint8Array(message);
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC:
        this.handleSyncMessage(ws, decoder);
        break;
      case MESSAGE_AWARENESS:
        this.handleAwarenessMessage(ws, decoder);
        break;
    }
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    const clientId = this.connectionMeta.get(ws);
    if (clientId !== undefined) {
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        [clientId],
        "disconnect",
      );
    }
    this.connectionMeta.delete(ws);

    if (this.ctx.getWebSockets().length === 0) {
      this.debouncedSave.call();
    }
  }

  webSocketError(ws: WebSocket): void {
    this.webSocketClose(ws);
  }

  // --- Yjs state persistence ---

  private async loadFromStorage(): Promise<void> {
    const storedState = await this.ctx.storage.get<Uint8Array>("yjs-state");
    if (storedState) {
      Y.applyUpdate(this.doc, new Uint8Array(storedState));
    }
  }

  private async saveToStorage(): Promise<void> {
    const state = Y.encodeStateAsUpdate(this.doc);
    await this.ctx.storage.put("yjs-state", state);
  }

  // --- Yjs sync/awareness protocol ---

  private setupDocListeners(): void {
    this.doc.on(
      "update",
      (update: Uint8Array, origin: WebSocket | null) => {
        this.debouncedSave.call();
        this.broadcastDocUpdate(update, origin);
      },
    );

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
  }

  private sendInitialSync(ws: WebSocket): void {
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

  private handleSyncMessage(
    ws: WebSocket,
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
    ws: WebSocket,
    decoder: decoding.Decoder,
  ): void {
    const update = decoding.readVarUint8Array(decoder);
    awarenessProtocol.applyAwarenessUpdate(this.awareness, update, ws);
  }

  private broadcastDocUpdate(
    update: Uint8Array,
    origin: WebSocket | null,
  ): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    this.broadcast(encoding.toUint8Array(encoder), origin ?? undefined);
  }

  private broadcastAwarenessUpdate(changedClients: number[]): void {
    if (changedClients.length === 0) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
    );
    this.broadcast(encoding.toUint8Array(encoder));
  }

  private broadcast(message: Uint8Array, except?: WebSocket): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== except && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}
