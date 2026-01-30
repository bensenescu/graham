import { useCallback, useMemo } from "react";
import * as Y from "yjs";
import { useYjsWebSocket, type UseYjsWebSocketReturn } from "./useYjsWebSocket";

export interface UsePageCollabOptions {
  pageId: string;
  enabled?: boolean;
}

export interface UsePageCollabReturn extends UseYjsWebSocketReturn {
  /** Get a Y.XmlFragment for a named field (creates if doesn't exist) */
  getFragment: (name: string) => Y.XmlFragment;
  /** Get the title fragment */
  getTitleFragment: () => Y.XmlFragment;
  /** Get a block's question fragment */
  getBlockQuestionFragment: (blockId: string) => Y.XmlFragment;
  /** Get a block's answer fragment */
  getBlockAnswerFragment: (blockId: string) => Y.XmlFragment;
}

/**
 * Hook for collaborative page editing using Yjs.
 *
 * Connects to /api/page-collab/{pageId} and provides access to
 * multiple named Y.XmlFragment fields within a single Y.Doc:
 * - `title` - page title
 * - `block:{blockId}:question` - each block's question
 * - `block:{blockId}:answer` - each block's answer
 */
export function usePageCollab({
  pageId,
  enabled = true,
}: UsePageCollabOptions): UsePageCollabReturn {
  const yjsResult = useYjsWebSocket({
    url: "/api/page-collab",
    roomName: pageId,
    enabled,
  });

  const { doc } = yjsResult;

  const getFragment = useCallback(
    (name: string): Y.XmlFragment => {
      return doc.getXmlFragment(name);
    },
    [doc],
  );

  const getTitleFragment = useCallback((): Y.XmlFragment => {
    return getFragment("title");
  }, [getFragment]);

  const getBlockQuestionFragment = useCallback(
    (blockId: string): Y.XmlFragment => {
      return getFragment(`block:${blockId}:question`);
    },
    [getFragment],
  );

  const getBlockAnswerFragment = useCallback(
    (blockId: string): Y.XmlFragment => {
      return getFragment(`block:${blockId}:answer`);
    },
    [getFragment],
  );

  return useMemo(
    () => ({
      ...yjsResult,
      getFragment,
      getTitleFragment,
      getBlockQuestionFragment,
      getBlockAnswerFragment,
    }),
    [
      yjsResult,
      getFragment,
      getTitleFragment,
      getBlockQuestionFragment,
      getBlockAnswerFragment,
    ],
  );
}
