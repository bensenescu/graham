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

interface BlockOrderItem {
  id: string;
  sortKey: string;
}

/**
 * PageMetaDO - Durable Object for collaborative page metadata
 *
 * Y.Doc structure:
 * - title: Y.Text (the page title)
 * - blockOrder: Y.Array<BlockOrderItem> (ordered list of block IDs with sort keys)
 *
 * This DO handles:
 * - WebSocket connections for real-time collaboration
 * - Page title synchronization
 * - Block ordering coordination (add, remove, reorder)
 * - Page-level presence awareness
 * - Periodic D1 database sync for persistence
 */
export class PageMetaDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private doc: Y.Doc;
  private awareness: awarenessProtocol.Awareness;
  private connections: Set<WebSocketWithUser> = new Set();
  private d1SyncTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastSyncedTitle: string | null = null;
  private pageId: string | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Initialize Yjs document
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    // Initialize shared types
    this.doc.getText("title");
    this.doc.getArray<BlockOrderItem>("blockOrder");

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

    // Extract page ID from the URL path
    const pathParts = url.pathname.split("/");
    this.pageId = pathParts[pathParts.length - 1] || null;

    // Handle WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }

    // Handle HTTP requests
    if (request.method === "GET" && url.pathname.endsWith("/state")) {
      return this.handleGetState();
    }

    // Handle block management via HTTP (for server-side operations)
    if (request.method === "POST") {
      return this.handleBlockManagement(request);
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

    if (this.pageId) {
      const titleText = this.doc.getText("title");
      const blockOrderArray = this.doc.getArray<BlockOrderItem>("blockOrder");

      const needsTitle = titleText.length === 0;
      const needsBlockOrder = blockOrderArray.length === 0;

      // If no Yjs state or missing critical data, hydrate from D1
      if (!storedState || needsTitle || needsBlockOrder) {
        const pageData = await this.loadPageFromD1();
        if (pageData) {
          if (needsTitle && pageData.title) {
            titleText.insert(0, pageData.title);
          }

          if (needsBlockOrder && pageData.blocks.length > 0) {
            blockOrderArray.push(pageData.blocks);
          }

          await this.saveToStorage();
        }
      }
    }

    // Track the current content for D1 sync comparison
    this.lastSyncedTitle = this.doc.getText("title").toString();
  }

  private async loadPageFromD1(): Promise<{
    title: string;
    blocks: BlockOrderItem[];
  } | null> {
    if (!this.pageId) return null;

    try {
      // Load page title
      const page = await this.env.DB.prepare(
        "SELECT title FROM pages WHERE id = ?",
      )
        .bind(this.pageId)
        .first<{ title: string }>();

      if (!page) return null;

      // Load blocks with their sort keys
      const blocks = await this.env.DB.prepare(
        "SELECT id, sort_key FROM page_blocks WHERE page_id = ? ORDER BY sort_key",
      )
        .bind(this.pageId)
        .all<{ id: string; sort_key: string }>();

      return {
        title: page.title,
        blocks:
          blocks.results?.map((b) => ({ id: b.id, sortKey: b.sort_key })) || [],
      };
    } catch (error) {
      console.error("Failed to load page from D1:", error);
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

  private async handleJsonMessage(
    ws: WebSocketWithUser,
    data: Record<string, unknown>,
  ): Promise<void> {
    // Handle block management commands
    switch (data.type) {
      case "addBlock": {
        const newBlock = {
          id: data.blockId as string,
          sortKey: data.sortKey as string,
        };
        const afterBlockId = data.afterBlockId as string | undefined;

        const blockOrderArray = this.doc.getArray<BlockOrderItem>("blockOrder");

        if (afterBlockId) {
          // Find the position after the specified block
          const items = blockOrderArray.toArray();
          const afterIndex = items.findIndex((b) => b.id === afterBlockId);
          if (afterIndex !== -1) {
            blockOrderArray.insert(afterIndex + 1, [newBlock]);
          } else {
            blockOrderArray.push([newBlock]);
          }
        } else {
          blockOrderArray.push([newBlock]);
        }
        break;
      }

      case "removeBlock": {
        const blockIdToRemove = data.blockId as string;
        const blockOrderArray = this.doc.getArray<BlockOrderItem>("blockOrder");
        const items = blockOrderArray.toArray();
        const index = items.findIndex((b) => b.id === blockIdToRemove);
        if (index !== -1) {
          blockOrderArray.delete(index, 1);
        }
        break;
      }

      case "reorderBlock": {
        const blockIdToMove = data.blockId as string;
        const newIndex = data.newIndex as number;
        const newSortKey = data.newSortKey as string;
        const blockOrderArray = this.doc.getArray<BlockOrderItem>("blockOrder");
        const items = blockOrderArray.toArray();
        const currentIndex = items.findIndex((b) => b.id === blockIdToMove);

        if (currentIndex !== -1 && currentIndex !== newIndex) {
          // Remove from current position
          blockOrderArray.delete(currentIndex, 1);

          // Insert at new position with new sort key
          const adjustedIndex =
            newIndex > currentIndex ? newIndex - 1 : newIndex;
          blockOrderArray.insert(adjustedIndex, [
            { id: blockIdToMove, sortKey: newSortKey },
          ]);
        }
        break;
      }

      case "presence": {
        // Broadcast presence update to other clients
        this.broadcast(
          JSON.stringify({
            type: "presence",
            userId: ws.userInfo?.userId,
            userName: ws.userInfo?.userName,
            userColor: ws.userInfo?.userColor,
            activeBlockId: data.activeBlockId,
          }),
          ws,
        );
        break;
      }
    }
  }

  private async handleBlockManagement(request: Request): Promise<Response> {
    const data = (await request.json()) as Record<string, unknown>;

    // Process block management commands via HTTP (for server-side operations)
    await this.handleJsonMessage(
      {
        userInfo: { userId: "system", userName: "System", userColor: "#000" },
      } as WebSocketWithUser,
      data,
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
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

    // Broadcast that this user left
    if (wsWithUser.userInfo) {
      this.broadcast(
        JSON.stringify({
          type: "userLeft",
          userId: wsWithUser.userInfo.userId,
        }),
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
    if (!this.pageId) return;

    const currentTitle = this.doc.getText("title").toString();

    // Sync title if changed
    if (this.lastSyncedTitle !== currentTitle) {
      try {
        await this.env.DB.prepare(
          "UPDATE pages SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
          .bind(currentTitle, this.pageId)
          .run();

        this.lastSyncedTitle = currentTitle;
        console.log(`Synced page title for ${this.pageId} to D1`);
      } catch (error) {
        console.error("Failed to sync title to D1:", error);
      }
    }

    // Sync block order - update sort keys in D1
    try {
      const blockOrderArray = this.doc.getArray<BlockOrderItem>("blockOrder");
      const blocks = blockOrderArray.toArray();

      // Batch update sort keys
      for (const block of blocks) {
        await this.env.DB.prepare(
          "UPDATE page_blocks SET sort_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
          .bind(block.sortKey, block.id)
          .run();
      }

      console.log(`Synced block order for page ${this.pageId} to D1`);
    } catch (error) {
      console.error("Failed to sync block order to D1:", error);
    }
  }

  private handleGetState(): Response {
    const blockOrderArray = this.doc.getArray<BlockOrderItem>("blockOrder");

    // Get connected users from awareness
    const users: Array<{
      id: string;
      name: string;
      color: string;
    }> = [];
    this.awareness.getStates().forEach((state) => {
      if (state.user) {
        users.push({
          id: state.user.userId,
          name: state.user.name,
          color: state.user.color,
        });
      }
    });

    return new Response(
      JSON.stringify({
        pageId: this.pageId,
        connectedClients: this.connections.size,
        title: this.doc.getText("title").toString(),
        blockOrder: blockOrderArray.toArray(),
        users,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
