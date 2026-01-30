import { useEffect, useMemo } from "react";
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
  userName,
  userColor,
  placeholder = "",
  className = "",
  onBlur,
  onFocus,
  initialContent,
  singleLine = false,
}: CollabTextEditorProps) {
  // Seed fragment with initial content if it's empty
  useEffect(() => {
    if (initialContent && fragment.length === 0) {
      // Insert initial content as a paragraph
      const paragraph = new Y.XmlElement("paragraph");
      const text = new Y.XmlText(initialContent);
      paragraph.insert(0, [text]);
      fragment.insert(0, [paragraph]);
    }
  }, [fragment, initialContent]);

  const extensions = useMemo(() => {
    const base = [
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
        },
        render: (user) => {
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
        selectionRender: (user) => ({
          style: `background-color: ${user.color}20;`,
        }),
      }),
    ];

    return base;
  }, [fragment, provider, userName, userColor, placeholder, singleLine]);

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
