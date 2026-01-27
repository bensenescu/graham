import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateRequest,
  getAuthConfig,
} from "@every-app/sdk/tanstack/server";
import { env } from "cloudflare:workers";

/**
 * WebSocket API route for block-level collaboration
 *
 * This route handles WebSocket connections for real-time editing
 * of a single Q&A block using Yjs.
 *
 * Query parameters:
 * - userId: The user's ID
 * - userName: The user's display name
 * - userColor: The user's cursor color (hex)
 */
// Route type will be generated during build
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute("/api/collab/block/$blockId" as any)({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { blockId: string } }) => {
        const { blockId } = params;

        // Check for WebSocket upgrade request
        const upgradeHeader = request.headers.get("Upgrade");
        if (upgradeHeader !== "websocket") {
          return new Response("Expected WebSocket upgrade", { status: 426 });
        }

        try {
          // Authenticate the request
          const authConfig = getAuthConfig();
          const session = await authenticateRequest(authConfig, request);

          if (!session || !session.sub) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Get user info from query params (passed by client)
          const url = new URL(request.url);
          const userName =
            url.searchParams.get("userName") || session.email || "Anonymous";
          const userColor = url.searchParams.get("userColor") || "#808080";

          // Get the Durable Object for this block
          const doId = env.PAGE_BLOCK_DO.idFromName(`block-${blockId}`);
          const doStub = env.PAGE_BLOCK_DO.get(doId);

          // Build the URL for the Durable Object
          const doUrl = new URL(request.url);
          doUrl.searchParams.set("userId", session.sub);
          doUrl.searchParams.set("userName", userName);
          doUrl.searchParams.set("userColor", userColor);

          // Forward the WebSocket request to the Durable Object
          return doStub.fetch(doUrl.toString(), {
            headers: request.headers,
          });
        } catch (error) {
          console.error("WebSocket block connection error:", error);
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
