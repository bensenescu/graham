import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { generateUserColor } from "./user-colors";

export interface UserInfo {
  userId: string;
  userName: string;
  userColor: string;
}

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface CollabConnection {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  userInfo: UserInfo;
}

interface ManagedConnection {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  userInfo: UserInfo;
  url: string;
  roomName: string;
  refCount: number;
  state: ConnectionState;
  listeners: Set<(state: ConnectionState) => void>;
  token: string | null;
}

interface GetConnectionOptions {
  /** Room name (e.g., pageId) */
  roomName: string;
  /** User info for awareness */
  userInfo: UserInfo;
  /** Base URL for WebSocket connection. Defaults to "/api/page-collab" */
  url?: string;
}

const DEFAULT_URL = "/api/page-collab";
const PROVIDER_READY_TIMEOUT_MS = 30_000;

/**
 * Singleton manager for collaboration connections.
 *
 * Creates WebSocket providers outside React's lifecycle to avoid:
 * - Race conditions from useEffect timing
 * - Provider recreation on dependency changes
 * - "No provider" flakiness
 *
 * Key behaviors:
 * - Lazily creates connections on first request
 * - Reuses existing connections (same url+roomName = same connection)
 * - Reference counting for cleanup
 * - Lives outside React entirely
 */
class CollabManager {
  private connections = new Map<string, ManagedConnection>();

  private getKey(url: string, roomName: string): string {
    return `${url}:${roomName}`;
  }

  /**
   * Get or create a connection.
   * Returns synchronously with a Y.Doc that's immediately usable.
   * The provider is created explicitly via connectWithToken.
   */
  getConnection(options: GetConnectionOptions): CollabConnection {
    const url = options.url ?? DEFAULT_URL;
    const key = this.getKey(url, options.roomName);

    // If we have an existing connection, increment ref count and return it
    const existing = this.connections.get(key);
    if (existing) {
      existing.refCount++;
      existing.userInfo = options.userInfo;
      return {
        doc: existing.doc,
        provider: existing.provider,
        userInfo: existing.userInfo,
      };
    }

    // Create new connection synchronously (doc available immediately)
    return this.createConnection(url, options.roomName, options.userInfo);
  }

  /**
   * Create or update a provider with a valid token.
   * If a provider already exists with the same token, no-op.
   * If the token changes, the provider is recreated with the same Y.Doc.
   */
  connectWithToken(options: {
    roomName: string;
    token: string;
    userInfo: UserInfo;
    url?: string;
  }): WebsocketProvider | null {
    const url = options.url ?? DEFAULT_URL;
    const key = this.getKey(url, options.roomName);

    const existing = this.connections.get(key);
    const conn =
      existing ??
      this.createManagedConnection(url, options.roomName, options.userInfo);

    conn.userInfo = options.userInfo;

    if (conn.provider && conn.token === options.token) {
      return conn.provider;
    }

    if (conn.provider) {
      conn.provider.destroy();
      conn.provider = null;
    }

    this.updateState(key, "connecting");
    this.createProvider(key, conn, options.token, options.userInfo);
    return conn.provider;
  }

  /**
   * Release a connection reference.
   * The actual connection is destroyed when refCount reaches 0.
   */
  releaseConnection(roomName: string, url: string = DEFAULT_URL): void {
    const key = this.getKey(url, roomName);
    const conn = this.connections.get(key);
    if (!conn) return;

    conn.refCount--;

    if (conn.refCount <= 0) {
      // Destroy provider and clean up
      conn.provider?.destroy();
      conn.listeners.clear();
      this.connections.delete(key);
    }
  }

  /**
   * Subscribe to connection state changes.
   */
  onStateChange(
    roomName: string,
    listener: (state: ConnectionState) => void,
    url: string = DEFAULT_URL,
  ): () => void {
    const key = this.getKey(url, roomName);
    const conn = this.connections.get(key);
    if (!conn) {
      // Return noop if no connection yet
      return () => {};
    }

    conn.listeners.add(listener);
    // Immediately notify of current state
    listener(conn.state);

    return () => {
      conn.listeners.delete(listener);
    };
  }

  /**
   * Get current connection state.
   */
  getState(roomName: string, url: string = DEFAULT_URL): ConnectionState {
    const key = this.getKey(url, roomName);
    const conn = this.connections.get(key);
    return conn?.state ?? "disconnected";
  }

  /**
   * Force reconnect.
   */
  reconnect(roomName: string, url: string = DEFAULT_URL): void {
    const key = this.getKey(url, roomName);
    const conn = this.connections.get(key);
    if (!conn || !conn.token) return;

    if (conn.provider) {
      conn.provider.destroy();
      conn.provider = null;
    }

    this.updateState(key, "connecting");
    this.createProvider(key, conn, conn.token, conn.userInfo);
  }

  /**
   * Destroy all connections.
   */
  destroy(): void {
    for (const [, conn] of this.connections) {
      conn.provider?.destroy();
      conn.listeners.clear();
    }
    this.connections.clear();
  }

  private createConnection(
    url: string,
    roomName: string,
    userInfo: UserInfo,
  ): CollabConnection {
    const managed = this.createManagedConnection(url, roomName, userInfo);
    return {
      doc: managed.doc,
      provider: managed.provider,
      userInfo: managed.userInfo,
    };
  }

  private createManagedConnection(
    url: string,
    roomName: string,
    userInfo: UserInfo,
  ): ManagedConnection {
    const key = this.getKey(url, roomName);

    // Create Y.Doc synchronously - available immediately for local editing
    const doc = new Y.Doc();

    // Create managed connection (provider will be attached async)
    const managedConn: ManagedConnection = {
      doc,
      provider: null,
      userInfo,
      url,
      roomName,
      refCount: 1,
      state: "disconnected",
      listeners: new Set(),
      token: null,
    };

    // Store connection immediately
    this.connections.set(key, managedConn);

    return managedConn;
  }

  private createProvider(
    key: string,
    conn: ManagedConnection,
    token: string,
    userInfo: UserInfo,
  ): void {
    try {
      // Build WebSocket URL
      const wsUrl = new URL(conn.url, window.location.origin);
      wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";

      const provider = new WebsocketProvider(
        wsUrl.origin + wsUrl.pathname,
        conn.roomName,
        conn.doc,
        {
          params: {
            token,
            userId: userInfo.userId,
            userName: userInfo.userName,
            userColor: userInfo.userColor,
          },
          connect: true,
          maxBackoffTime: 30000,
        },
      );

      conn.token = token;

      provider.awareness.setLocalStateField("user", {
        name: userInfo.userName,
        color: userInfo.userColor,
        userId: userInfo.userId,
      });

      provider.on("status", ({ status }: { status: string }) => {
        if (status === "connected") {
          this.updateState(key, "connected");
        } else if (status === "disconnected") {
          this.updateState(
            key,
            provider.wsconnecting ? "connecting" : "disconnected",
          );
        }
      });

      provider.on("connection-error", () => {
        this.updateState(key, "error");
      });

      conn.provider = provider;
      this.notifyProviderReady(key);
    } catch (error) {
      console.error("[CollabManager] Failed to connect provider:", error);
      this.updateState(key, "error");
    }
  }

  /**
   * Get the current provider for a connection (may be null if still connecting).
   */
  getProvider(
    roomName: string,
    url: string = DEFAULT_URL,
  ): WebsocketProvider | null {
    const key = this.getKey(url, roomName);
    return this.connections.get(key)?.provider ?? null;
  }

  private providerReadyListeners = new Map<string, Set<() => void>>();
  private providerReadyTimeouts = new Map<
    string,
    Map<() => void, ReturnType<typeof setTimeout>>
  >();

  /**
   * Subscribe to be notified when a provider becomes ready.
   */
  onProviderReady(
    roomName: string,
    listener: () => void,
    url: string = DEFAULT_URL,
  ): () => void {
    const key = this.getKey(url, roomName);
    const conn = this.connections.get(key);

    // If provider already exists, call immediately
    if (conn?.provider) {
      listener();
      return () => {};
    }

    // Otherwise, add to pending listeners
    if (!this.providerReadyListeners.has(key)) {
      this.providerReadyListeners.set(key, new Set());
    }
    this.providerReadyListeners.get(key)!.add(listener);

    if (!this.providerReadyTimeouts.has(key)) {
      this.providerReadyTimeouts.set(key, new Map());
    }

    const timeoutId = setTimeout(() => {
      this.providerReadyListeners.get(key)?.delete(listener);
      const timeouts = this.providerReadyTimeouts.get(key);
      timeouts?.delete(listener);

      if (this.providerReadyListeners.get(key)?.size === 0) {
        this.providerReadyListeners.delete(key);
      }
      if (timeouts?.size === 0) {
        this.providerReadyTimeouts.delete(key);
      }
    }, PROVIDER_READY_TIMEOUT_MS);

    this.providerReadyTimeouts.get(key)!.set(listener, timeoutId);

    return () => {
      this.providerReadyListeners.get(key)?.delete(listener);
      const timeouts = this.providerReadyTimeouts.get(key);
      const existingTimeout = timeouts?.get(listener);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        timeouts?.delete(listener);
      }
      if (this.providerReadyListeners.get(key)?.size === 0) {
        this.providerReadyListeners.delete(key);
      }
      if (timeouts?.size === 0) {
        this.providerReadyTimeouts.delete(key);
      }
    };
  }

  private notifyProviderReady(key: string): void {
    const listeners = this.providerReadyListeners.get(key);
    const timeouts = this.providerReadyTimeouts.get(key);
    if (listeners) {
      for (const listener of listeners) {
        const timeoutId = timeouts?.get(listener);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        listener();
      }
      this.providerReadyListeners.delete(key);
      this.providerReadyTimeouts.delete(key);
    }
  }

  private updateState(key: string, state: ConnectionState): void {
    const conn = this.connections.get(key);
    if (!conn) return;

    conn.state = state;
    for (const listener of conn.listeners) {
      listener(state);
    }
  }
}

// Export singleton instance
export const collabManager = new CollabManager();
