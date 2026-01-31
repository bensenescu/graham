import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { proxyWebsocketRequest } from "../helpers/-websocketProxy";

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
        return proxyWebsocketRequest({
          request,
          roomName: `room-${roomId}`,
          doNamespace: env.SIMPLE_COLLAB_DO,
          logTag: "api/test-collaboration",
          logContext: { roomId },
          checkAccess: async (userId: string) => {
            if (roomId !== userId) {
              throw new Error("Not authorized for this room");
            }
          },
        });
      },
    },
  },
});
