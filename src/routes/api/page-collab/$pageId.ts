import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateRequest,
  getAuthConfig,
} from "@every-app/sdk/tanstack/server";
import { env } from "cloudflare:workers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute("/api/page-collab/$pageId" as any)({
  server: {
    handlers: {
      GET: async ({
        request,
        params,
      }: {
        request: Request;
        params: { pageId: string };
      }) => {
        const { pageId } = params;

        const upgradeHeader = request.headers.get("Upgrade");
        const requestUrl = new URL(request.url);
        const tokenParam = requestUrl.searchParams.get("token");
        console.debug("[api/page-collab] incoming", {
          pageId,
          upgradeHeader,
          hasTokenParam: !!tokenParam,
        });
        if (upgradeHeader !== "websocket") {
          return new Response("Expected WebSocket upgrade", { status: 426 });
        }

        try {
          const authConfig = getAuthConfig();
          const url = new URL(request.url);
          const token = url.searchParams.get("token");
          if (token) {
            const headers = new Headers(request.headers);
            headers.set("Authorization", `Bearer ${token}`);
            request = new Request(request, { headers });
            url.searchParams.delete("token");
          }

          console.debug("[api/page-collab] auth header set", {
            pageId,
            hasToken: !!token,
          });

          const session = await authenticateRequest(authConfig, request);

          console.debug("[api/page-collab] auth result", {
            pageId,
            hasSession: !!session,
            userId: session?.sub ?? null,
            email: session?.email ?? null,
          });

          if (!session || !session.sub) {
            console.debug("[api/page-collab] unauthorized", { pageId });
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const userName =
            url.searchParams.get("userName") || session.email || "Anonymous";
          const userColor = url.searchParams.get("userColor") || "#808080";

          const doId = env.PAGE_COLLAB_DO.idFromName(`page-${pageId}`);
          const doStub = env.PAGE_COLLAB_DO.get(doId);

          const doUrl = new URL(request.url);
          doUrl.searchParams.set("userId", session.sub);
          doUrl.searchParams.set("userName", userName);
          doUrl.searchParams.set("userColor", userColor);

          const doRequest = new Request(doUrl.toString(), request);
          console.debug("[api/page-collab] proxy to DO", {
            pageId,
            hasUserId: !!session.sub,
          });
          return doStub.fetch(doRequest);
        } catch (error) {
          console.error("Page collab connection error:", error);
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
      },
    },
  },
});
