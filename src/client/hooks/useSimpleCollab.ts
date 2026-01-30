import { useYjsWebSocket, type UserInfo } from "./useYjsWebSocket";

export interface UseSimpleCollabOptions {
  roomId: string;
  userInfo: UserInfo;
  enabled?: boolean;
}

export function useSimpleCollab({
  roomId,
  userInfo,
  enabled = true,
}: UseSimpleCollabOptions) {
  return useYjsWebSocket({
    url: "/api/test-collaboration",
    roomName: roomId,
    userInfo,
    enabled,
  });
}
