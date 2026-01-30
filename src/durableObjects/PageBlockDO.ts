import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";

// Message types for Yjs protocol
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

// D1 sync debounce interval (10 seconds)
const D1_SYNC_DEBOUNCE_MS = 10000;

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
 * PageBlockDO - Durable Object for collaborative editing of a single Q&A block
 *
 * Y.Doc structure:
 * - question: Y.Text (the question text)
 * - answer: Y.Text (the answer text)
 *
 * This DO handles:
 * - WebSocket connections for real-time collaboration
 * - Yjs document state synchronization
 * - User awareness (cursor positions, user info)
 * - Periodic D1 database sync for persistence
 */
export class PageBlockDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private doc: Y.Doc;
  private awareness: awarenessProtocol.Awareness;
  private connections: Set<WebSocketWithUser> = new Set();
  private d1SyncTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastSyncedContent: { question: string; answer: string } | null = null;
  private blockId: string | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Initialize Yjs document
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    // Get the question and answer Y.Text instances
    this.doc.getText("question");
    this.doc.getText("answer");

    // Listen for document updates to trigger D1 sync and broadcast changes
    this.doc.on("update", (update, origin) => {
      this.scheduleD1Sync();
      this.broadcastDocUpdate(update, origin as WebSocketWithUser | null);
    });

    // Clean up awareness when clients disconnect
    this.awareness.on(
      "update",
      ({ added, removed }: { added: number[]; removed: number[] }) => {
        const changedClients = added.concat(removed);
        this.broadcastAwarenessUpdate(changedClients);
      },
    );

    // Block concurrency by default for Yjs consistency
    // Note: blockConcurrencyByDefault() may not be in all type definitions
    // but is a valid Cloudflare Durable Object method
    (
      this.state as unknown as { blockConcurrencyByDefault?: () => void }
    ).blockConcurrencyByDefault?.();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Extract block ID from the URL path
    const pathParts = url.pathname.split("/");
    this.blockId = pathParts[pathParts.length - 1] || null;

    // Handle WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }

    // Handle HTTP requests for state inspection/management
    if (request.method === "GET" && url.pathname.endsWith("/state")) {
      return this.handleGetState();
    }

    return new Response("Not found", { status: 404 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    // Parse user info from query parameters
    const url = new URL(request.url);
    const userInfo: UserInfo = {
      userId: url.searchParams.get("userId") || "anonymous",
      userName: url.searchParams.get("userName") || "Anonymous",
      userColor: url.searchParams.get("userColor") || "#808080",
    };

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // Tag the server socket with user info
    const ws = server as WebSocketWithUser;
    ws.userInfo = userInfo;
    ws.clientId = Math.floor(Math.random() * 2147483647);

    // Accept the WebSocket
    this.state.acceptWebSocket(server);

    // Load stored state if this is first connection
    if (this.connections.size === 0) {
      await this.loadFromStorage();
    }

    this.connections.add(ws);

    // Set up awareness for this client
    this.awareness.setLocalStateField("user", {
      name: userInfo.userName,
      color: userInfo.userColor,
      userId: userInfo.userId,
    });

    // Send initial sync to new client
    this.sendInitialSync(ws);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async loadFromStorage(): Promise<void> {
    // Load Yjs state from Durable Object storage
    const storedState = await this.state.storage.get<Uint8Array>("yjs-state");
    if (storedState) {
      Y.applyUpdate(this.doc, new Uint8Array(storedState));
    }

    if (this.blockId) {
      const questionText = this.doc.getText("question");
      const answerText = this.doc.getText("answer");

      const needsQuestion = questionText.length === 0;
      const needsAnswer = answerText.length === 0;

      // If no Yjs state or missing critical data, hydrate from D1
      if (!storedState || needsQuestion || needsAnswer) {
        const block = await this.loadBlockFromD1();
        if (block) {
          if (needsQuestion && block.question) {
            questionText.insert(0, block.question);
          }
          if (needsAnswer && block.answer) {
            answerText.insert(0, block.answer);
          }

          await this.saveToStorage();
        }
      }
    }

    // Track the current content for D1 sync comparison
    this.lastSyncedContent = {
      question: this.doc.getText("question").toString(),
      answer: this.doc.getText("answer").toString(),
    };
  }

  private async loadBlockFromD1(): Promise<{
    question: string;
    answer: string;
  } | null> {
    if (!this.blockId) return null;

    try {
      const result = await this.env.DB.prepare(
        "SELECT question, answer FROM page_blocks WHERE id = ?",
      )
        .bind(this.blockId)
        .first<{ question: string; answer: string }>();
      return result;
    } catch (error) {
      console.error("Failed to load block from D1:", error);
      return null;
    }
  }

  private async saveToStorage(): Promise<void> {
    const state = Y.encodeStateAsUpdate(this.doc);
    await this.state.storage.put("yjs-state", state);
  }

  private sendInitialSync(ws: WebSocketWithUser): void {
    // Send sync step 1 (state vector)
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    ws.send(encoding.toUint8Array(encoder));

    // Send current awareness state
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
    if (typeof message === "string") {
      // Handle text messages (could be JSON commands)
      try {
        const data = JSON.parse(message);
        this.handleJsonMessage(ws as WebSocketWithUser, data);
      } catch {
        console.error("Invalid JSON message received");
      }
      return;
    }

    // Handle binary Yjs protocol messages
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
        console.warn("Unknown message type:", messageType);
    }
  }

  private handleSyncMessage(
    ws: WebSocketWithUser,
    decoder: decoding.Decoder,
  ): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);

    const syncMessageType = syncProtocol.readSyncMessage(
      decoder,
      encoder,
      this.doc,
      ws,
    );

    // If we have a response, send it
    if (encoding.length(encoder) > 1) {
      ws.send(encoding.toUint8Array(encoder));
    }

    // Save state after receiving updates
    this.saveToStorage();
  }

  private handleAwarenessMessage(
    ws: WebSocketWithUser,
    decoder: decoding.Decoder,
  ): void {
    const update = decoding.readVarUint8Array(decoder);
    awarenessProtocol.applyAwarenessUpdate(this.awareness, update, ws);
  }

  private handleJsonMessage(
    ws: WebSocketWithUser,
    data: Record<string, unknown>,
  ): void {
    // Handle custom JSON messages (e.g., cursor position updates)
    if (data.type === "cursor") {
      // Broadcast cursor position to other clients
      this.broadcast(
        JSON.stringify({
          type: "cursor",
          userId: ws.userInfo?.userId,
          userName: ws.userInfo?.userName,
          userColor: ws.userInfo?.userColor,
          position: data.position,
          field: data.field, // 'question' or 'answer'
        }),
        ws,
      );
    }
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

  private broadcast(
    message: Uint8Array | string,
    except?: WebSocketWithUser,
  ): void {
    for (const ws of this.connections) {
      if (ws !== except && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  webSocketClose(ws: WebSocket): void {
    this.connections.delete(ws as WebSocketWithUser);

    // Remove this client's awareness state
    const wsWithUser = ws as WebSocketWithUser;
    if (wsWithUser.clientId !== undefined) {
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        [wsWithUser.clientId],
        "disconnect",
      );
    }

    // Save state when last client disconnects
    if (this.connections.size === 0) {
      this.saveToStorage();
      this.syncToD1();
    }
  }

  webSocketError(ws: WebSocket, error: unknown): void {
    console.error("WebSocket error:", error);
    this.webSocketClose(ws);
  }

  private scheduleD1Sync(): void {
    // Debounce D1 sync
    if (this.d1SyncTimeout) {
      clearTimeout(this.d1SyncTimeout);
    }

    this.d1SyncTimeout = setTimeout(() => {
      this.syncToD1();
    }, D1_SYNC_DEBOUNCE_MS);
  }

  private async syncToD1(): Promise<void> {
    if (!this.blockId) return;

    const currentContent = {
      question: this.doc.getText("question").toString(),
      answer: this.doc.getText("answer").toString(),
    };

    // Only sync if content has changed
    if (
      this.lastSyncedContent &&
      currentContent.question === this.lastSyncedContent.question &&
      currentContent.answer === this.lastSyncedContent.answer
    ) {
      return;
    }

    try {
      await this.env.DB.prepare(
        "UPDATE page_blocks SET question = ?, answer = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
        .bind(currentContent.question, currentContent.answer, this.blockId)
        .run();

      this.lastSyncedContent = currentContent;
      console.log(`Synced block ${this.blockId} to D1`);
    } catch (error) {
      console.error("Failed to sync to D1:", error);
    }
  }

  private handleGetState(): Response {
    return new Response(
      JSON.stringify({
        blockId: this.blockId,
        connectedClients: this.connections.size,
        question: this.doc.getText("question").toString(),
        answer: this.doc.getText("answer").toString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
