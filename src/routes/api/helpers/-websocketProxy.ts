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
}

export async function proxyWebsocketRequest({
  request,
  doNamespace,
  roomName,
  logTag,
  logContext = {},
}: WebsocketProxyOptions) {
  const upgradeHeader = request.headers.get("Upgrade");
  const requestUrl = new URL(request.url);
  const tokenParam = requestUrl.searchParams.get("token");

  console.debug(`${logTag} incoming`, {
    ...logContext,
    upgradeHeader,
    hasTokenParam: !!tokenParam,
  });

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

    console.debug(`${logTag} auth header set`, {
      ...logContext,
      hasToken: !!token,
    });

    const { session, response } = await requireApiAuth(request);

    console.debug(`${logTag} auth result`, {
      ...logContext,
      hasSession: !!session,
      userId: session?.sub ?? null,
      email: session?.email ?? null,
    });

    if (response || !session || !session.sub) {
      console.debug(`${logTag} unauthorized`, { ...logContext });
      return (
        response ??
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      );
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
    console.debug(`${logTag} proxy to DO`, {
      ...logContext,
      hasUserId: !!session.sub,
    });
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
