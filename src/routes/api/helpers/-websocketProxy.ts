import { requireApiAuth } from "@/middleware/apiAuth";
import { z } from "zod";

const websocketQuerySchema = z.object({
  token: z.string().min(1).optional(),
  userName: z.string().min(1).max(64).optional(),
  userColor: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/)
    .optional(),
});

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
    const token = url.searchParams.get("token") ?? undefined;
    const userNameParam = url.searchParams.get("userName") ?? undefined;
    const userColorParam = url.searchParams.get("userColor") ?? undefined;
    const validationResult = websocketQuerySchema.safeParse({
      token,
      userName: userNameParam,
      userColor: userColorParam,
    });

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid query parameters",
          details: validationResult.error.issues[0]?.message,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const {
      token: validatedToken,
      userName,
      userColor,
    } = validationResult.data;

    if (validatedToken) {
      const headers = new Headers(request.headers);
      headers.set("Authorization", `Bearer ${validatedToken}`);
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

    const resolvedUserName = userName || session.email || "Anonymous";
    const resolvedUserColor = userColor || "#808080";

    const doId = doNamespace.idFromName(roomName);
    const doStub = doNamespace.get(doId);

    const doUrl = new URL(request.url);
    doUrl.searchParams.set("userId", session.sub);
    doUrl.searchParams.set("userName", resolvedUserName);
    doUrl.searchParams.set("userColor", resolvedUserColor);

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
