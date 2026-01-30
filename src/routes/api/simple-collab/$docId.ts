import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateRequest,
  getAuthConfig,
} from "@every-app/sdk/tanstack/server";
import { env } from "cloudflare:workers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute("/api/simple-collab/$docId" as any)({
  server: {
    handlers: {
      GET: async ({
        request,
        params,
      }: {
        request: Request;
        params: { docId: string };
      }) => {
        const { docId } = params;

        const upgradeHeader = request.headers.get("Upgrade");
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

          const session = await authenticateRequest(authConfig, request);

          if (!session || !session.sub) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const userName =
            url.searchParams.get("userName") || session.email || "Anonymous";
          const userColor = url.searchParams.get("userColor") || "#808080";

          const doId = env.SIMPLE_COLLAB_DO.idFromName(`doc-${docId}`);
          const doStub = env.SIMPLE_COLLAB_DO.get(doId);

          const doUrl = new URL(request.url);
          doUrl.searchParams.set("userId", session.sub);
          doUrl.searchParams.set("userName", userName);
          doUrl.searchParams.set("userColor", userColor);

          const doRequest = new Request(doUrl.toString(), request);
          return doStub.fetch(doRequest);
        } catch (error) {
          console.error("Simple collab connection error:", error);
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
