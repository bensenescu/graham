import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { proxyWebsocketRequest } from "../helpers/-websocketProxy";
import { z } from "zod";
import { errorResponse } from "../helpers/apiResponses";

const roomIdSchema = z.string().min(1).max(128);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute("/api/test-collaboration/$roomId" as any)({
  server: {
    handlers: {
      GET: async ({
        request,
        params,
      }: {
        request: Request;
        params: { roomId: string };
      }) => {
        const { roomId } = params;
        const roomIdResult = roomIdSchema.safeParse(roomId);
        if (!roomIdResult.success) {
          return errorResponse({
            error: "Invalid roomId",
            details: roomIdResult.error.issues[0]?.message,
            status: 400,
          });
        }
        return proxyWebsocketRequest({
          request,
          roomName: `room-${roomId}`,
          doNamespace: env.SIMPLE_COLLAB_DO,
          logTag: "api/test-collaboration",
          logContext: { roomId },
          // No checkAccess — any authenticated user can join any test room
        });
      },
    },
  },
});
