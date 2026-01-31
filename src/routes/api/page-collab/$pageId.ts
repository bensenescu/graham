import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { proxyWebsocketRequest } from "@/routes/api/helpers/-websocketProxy";

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
        return proxyWebsocketRequest({
          request,
          doNamespace: env.PAGE_COLLAB_DO,
          roomName: `page-${pageId}`,
          logTag: "[api/page-collab]",
          logContext: { pageId },
        });
      },
    },
  },
});
