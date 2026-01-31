import { useEffect, useMemo, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import * as Y from "yjs";
import type { WebsocketProvider } from "y-websocket";

export interface CollabTextEditorProps {
  /** Y.XmlFragment to sync with */
  fragment: Y.XmlFragment;
  /** WebSocket provider for awareness (cursor positions) */
  provider: WebsocketProvider;
  /** Current user's ID for filtering own cursor */
  userId: string;
  /** Current user's name for cursor label */
  userName: string;
  /** Current user's color for cursor */
  userColor: string;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Additional CSS classes for the editor content */
  className?: string;
  /** Called when editor loses focus */
  onBlur?: () => void;
  /** Called when editor gains focus */
  onFocus?: () => void;
  /** Initial content to seed if fragment is empty (plain text) */
  initialContent?: string;
  /** Stable identifier for this fragment (used to prevent duplicate seeding) */
  fragmentName: string;
  /** Whether this is a single-line editor (no line breaks allowed) */
  singleLine?: boolean;
}

/**
 * Collaborative text editor using TipTap with Yjs.
 *
 * Renders a TipTap editor connected to a Y.XmlFragment for
 * real-time collaborative editing with cursor awareness.
 */
export function CollabTextEditor({
  fragment,
  provider,
  userId,
  userName,
  userColor,
  placeholder = "",
  className = "",
  onBlur,
  onFocus,
  initialContent,
  fragmentName,
  singleLine = false,
}: CollabTextEditorProps) {
  // Track if we've already seeded this fragment to prevent duplicates
  const hasSeededRef = useRef(false);
  const fragmentIdRef = useRef<string | null>(null);

  // Reset seeding flag if fragment changes (different field)
  // Use fragmentName (stable) instead of fragment.toString() (content-based, unstable)
  const fragmentId = fragment.doc?.guid + "-" + fragmentName;
  if (fragmentIdRef.current !== fragmentId) {
    fragmentIdRef.current = fragmentId;
    hasSeededRef.current = false;
  }

  // Seed fragment with initial content if it's empty and synced
  useEffect(() => {
    if (hasSeededRef.current) return;
    if (!initialContent) return;

    // Wait for provider to sync before checking if we should seed
    const handleSync = () => {
      // Double-check we haven't seeded yet (could have happened in another effect)
      if (hasSeededRef.current) return;

      // Only seed if fragment is truly empty after sync
      if (fragment.length === 0) {
        hasSeededRef.current = true;
        const paragraph = new Y.XmlElement("paragraph");
        const text = new Y.XmlText(initialContent);
        paragraph.insert(0, [text]);
        fragment.insert(0, [paragraph]);
      } else {
        // Fragment has content from server, don't seed
        hasSeededRef.current = true;
      }
    };

    // Check if provider is already synced
    if (provider.synced) {
      handleSync();
    } else {
      // Wait for sync event
      provider.once("sync", handleSync);
      return () => {
        provider.off("sync", handleSync);
      };
    }
  }, [fragment, initialContent, provider]);

  const extensions = useMemo(() => {
    return [
      StarterKit.configure({
        // Disable undo/redo - Yjs handles it
        undoRedo: false,
        // For single-line, disable block-level formatting
        ...(singleLine && {
          heading: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        }),
      }),
      Placeholder.configure({
        placeholder,
      }),
      Collaboration.configure({
        fragment,
      }),
      CollaborationCaret.configure({
        provider,
        user: {
          name: userName,
          color: userColor,
          userId: userId,
        },
        render: (user) => {
          // Don't render cursor for our own user (filter by userId for reliability)
          if (user.userId === userId) {
            return document.createElement("span"); // Empty element
          }

          const cursor = document.createElement("span");
          cursor.classList.add("collab-caret");
          cursor.style.borderColor = user.color;

          const label = document.createElement("span");
          label.classList.add("collab-caret-label");
          label.style.backgroundColor = user.color;
          label.textContent = user.name;

          cursor.appendChild(label);
          return cursor;
        },
        selectionRender: (user) => {
          // Don't render selection for our own user (filter by userId for reliability)
          if (user.userId === userId) {
            return {};
          }
          return {
            style: `background-color: ${user.color}20;`,
          };
        },
      }),
    ];
  }, [
    fragment,
    provider,
    userId,
    userName,
    userColor,
    placeholder,
    singleLine,
  ]);

  const editor = useEditor({
    extensions,
    editorProps: {
      attributes: {
        class: `outline-none focus:outline-none ${className}`,
      },
      handleKeyDown: singleLine
        ? (view, event) => {
            // Prevent Enter key in single-line mode
            if (event.key === "Enter") {
              event.preventDefault();
              // Blur to trigger save
              view.dom.blur();
              return true;
            }
            return false;
          }
        : undefined,
    },
    onBlur: () => {
      onBlur?.();
    },
    onFocus: () => {
      onFocus?.();
    },
  });

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return <EditorContent editor={editor} />;
}

/**
 * Get plain text content from a Y.XmlFragment
 */
export function getFragmentText(fragment: Y.XmlFragment): string {
  let text = "";
  fragment.toArray().forEach((item) => {
    if (item instanceof Y.XmlText) {
      text += item.toString();
    } else if (item instanceof Y.XmlElement) {
      // Recursively get text from child elements
      text += getElementText(item);
    }
  });
  return text;
}

function getElementText(element: Y.XmlElement): string {
  let text = "";
  element.toArray().forEach((item) => {
    if (item instanceof Y.XmlText) {
      text += item.toString();
    } else if (item instanceof Y.XmlElement) {
      text += getElementText(item);
    }
  });
  return text;
}
