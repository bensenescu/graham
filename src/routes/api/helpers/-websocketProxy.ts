import { requireApiAuth } from "@/middleware/apiAuth";

type DurableObjectNamespace = {
  idFromName: (name: string) => any;
  get: (
    id: any,
    options?: any,
  ) => { fetch: (request: Request) => Promise<Response> };
};

interface WebsocketProxyOptions {
  request: Request;
  doNamespace: DurableObjectNamespace;
  roomName: string;
  logTag: string;
  logContext?: Record<string, unknown>;
  /** Optional authorization check. If provided, must not throw to allow access. */
  checkAccess?: (userId: string) => Promise<void>;
}

export async function proxyWebsocketRequest({
  request,
  doNamespace,
  roomName,
  logTag,
  logContext = {},
  checkAccess,
}: WebsocketProxyOptions) {
  const upgradeHeader = request.headers.get("Upgrade");

  if (upgradeHeader !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (token) {
      const headers = new Headers(request.headers);
      headers.set("Authorization", `Bearer ${token}`);
      request = new Request(request, { headers });
      url.searchParams.delete("token");
    }

    const { session, response } = await requireApiAuth(request);

    if (response || !session || !session.sub) {
      return (
        response ??
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    // Optional authorization check (e.g., page access)
    if (checkAccess) {
      try {
        await checkAccess(session.sub);
      } catch (error) {
        console.warn(`${logTag} access denied`, {
          ...logContext,
          userId: session.sub,
          error: error instanceof Error ? error.message : "Unknown",
        });
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const userName =
      url.searchParams.get("userName") || session.email || "Anonymous";
    const userColor = url.searchParams.get("userColor") || "#808080";

    const doId = doNamespace.idFromName(roomName);
    const doStub = doNamespace.get(doId);

    const doUrl = new URL(request.url);
    doUrl.searchParams.set("userId", session.sub);
    doUrl.searchParams.set("userName", userName);
    doUrl.searchParams.set("userColor", userColor);

    const doRequest = new Request(doUrl.toString(), request);
    return doStub.fetch(doRequest);
  } catch (error) {
    console.error(`${logTag} connection error:`, error);
    return new Response(
      JSON.stringify({
        error: "Failed to establish WebSocket connection",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
