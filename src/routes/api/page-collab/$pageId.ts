import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { proxyWebsocketRequest } from "@/routes/api/helpers/-websocketProxy";
import { ensurePageAccessWithSharing } from "@/server/services/helpers/ensurePageAccess";
import { z } from "zod";
import { errorResponse } from "../helpers/apiResponses";

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
        const pageIdResult = z.string().uuid().safeParse(pageId);
        if (!pageIdResult.success) {
          return errorResponse({
            error: "Invalid pageId",
            details: pageIdResult.error.issues[0]?.message,
            status: 400,
          });
        }
        return proxyWebsocketRequest({
          request,
          doNamespace: env.PAGE_COLLAB_DO,
          roomName: `page-${pageId}`,
          logTag: "[api/page-collab]",
          logContext: { pageId },
          checkAccess: async (userId: string) => {
            // Throws if user doesn't have access (owner or collaborator)
            await ensurePageAccessWithSharing(pageId, userId);
          },
        });
      },
    },
  },
});
