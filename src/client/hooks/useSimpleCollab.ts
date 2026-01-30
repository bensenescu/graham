import { useYjsWebSocket, type UserInfo } from "./useYjsWebSocket";

export interface UseSimpleCollabOptions {
  docId: string;
  userInfo: UserInfo;
  enabled?: boolean;
}

export function useSimpleCollab({
  docId,
  userInfo,
  enabled = true,
}: UseSimpleCollabOptions) {
  return useYjsWebSocket({
    url: "/api/simple-collab",
    roomName: docId,
    userInfo,
    enabled,
  });
}
