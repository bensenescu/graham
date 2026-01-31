import { createContext, useContext } from "react";
import type { UsePageCollabReturn } from "@/client/hooks/usePageCollab";

export interface PageCollabContextValue {
  collab: UsePageCollabReturn | null;
  isCollabReady: boolean;
}

export const PageCollabContext = createContext<PageCollabContextValue>({
  collab: null,
  isCollabReady: false,
});

export function usePageCollabContext() {
  return useContext(PageCollabContext);
}
