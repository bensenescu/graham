import { useCallback, useMemo } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useCollab } from "./useCollab";
import type { ConnectionState } from "@/client/lib/PageCollabManager";
import type { UserInfo } from "./collabTypes";

// Re-export types for consumers
export type { UserInfo } from "./collabTypes";
export type { ConnectionState } from "@/client/lib/PageCollabManager";

export interface UsePageCollabOptions {
  pageId: string;
  enabled?: boolean;
  sessionToken?: string | null;
}

export interface UsePageCollabReturn {
  doc: Y.Doc | null;
  provider: WebsocketProvider | null;
  connectionState: ConnectionState;
  isSynced: boolean;
  hasSyncedOnce: boolean;
  reconnect: () => Promise<void>;
  userInfo: UserInfo;
  /** Get a Y.XmlFragment for a named field (creates if doesn't exist) */
  getFragment: (name: string) => Y.XmlFragment | null;
  /** Get the title fragment */
  getTitleFragment: () => Y.XmlFragment | null;
  /** Get a block's question fragment */
  getBlockQuestionFragment: (blockId: string) => Y.XmlFragment | null;
  /** Get a block's answer fragment */
  getBlockAnswerFragment: (blockId: string) => Y.XmlFragment | null;
}

/**
 * Hook for collaborative page editing using Yjs.
 */
export function usePageCollab({
  pageId,
  enabled = true,
  sessionToken,
}: UsePageCollabOptions): UsePageCollabReturn {
  const {
    doc,
    provider,
    connectionState,
    isSynced,
    hasSyncedOnce,
    reconnect,
    userInfo,
  } = useCollab({
    url: "/api/page-collab",
    roomName: pageId,
    enabled,
    sessionToken,
  });

  const getFragment = useCallback(
    (name: string): Y.XmlFragment | null => {
      if (!doc) return null;
      return doc.getXmlFragment(name);
    },
    [doc],
  );

  const getTitleFragment = useCallback((): Y.XmlFragment | null => {
    return getFragment("title");
  }, [getFragment]);

  const getBlockQuestionFragment = useCallback(
    (blockId: string): Y.XmlFragment | null => {
      return getFragment(`block:${blockId}:question`);
    },
    [getFragment],
  );

  const getBlockAnswerFragment = useCallback(
    (blockId: string): Y.XmlFragment | null => {
      return getFragment(`block:${blockId}:answer`);
    },
    [getFragment],
  );

  return useMemo(
    () => ({
      doc,
      provider,
      connectionState,
      isSynced,
      hasSyncedOnce,
      reconnect,
      userInfo,
      getFragment,
      getTitleFragment,
      getBlockQuestionFragment,
      getBlockAnswerFragment,
    }),
    [
      doc,
      provider,
      connectionState,
      isSynced,
      hasSyncedOnce,
      reconnect,
      userInfo,
      getFragment,
      getTitleFragment,
      getBlockQuestionFragment,
      getBlockAnswerFragment,
    ],
  );
}
