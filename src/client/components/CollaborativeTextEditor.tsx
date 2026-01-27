import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";

export interface CollaborativeTextEditorUser {
  name: string;
  color: string;
  userId?: string;
}

export interface CollaborativeTextEditorProps {
  /** The Yjs Y.Text to sync with */
  yText: Y.Text;
  /** The Y.Doc containing the Y.Text (needed for Collaboration extension) */
  doc: Y.Doc;
  /** The awareness instance for cursor sync */
  awareness: Awareness;
  /** User information for cursor display */
  user: CollaborativeTextEditorUser;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Called when editor gains focus */
  onFocus?: () => void;
  /** Called when editor loses focus */
  onBlur?: () => void;
  /** Called when content changes (debounced for performance) */
  onChange?: (text: string) => void;
  /** Whether the editor should auto-focus */
  autoFocus?: boolean;
  /** Tab index for keyboard navigation */
  tabIndex?: number;
  /** ID for the editor element */
  id?: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Minimum height in rows (like textarea rows) */
  minRows?: number;
}

/**
 * Collaborative plain text editor using TipTap + Yjs
 *
 * This component provides a TipTap editor configured for plain text only,
 * with real-time collaboration via Yjs and cursor presence.
 *
 * Styled to look like the existing textarea components.
 */
export function CollaborativeTextEditor({
  yText,
  doc,
  awareness,
  user,
  placeholder,
  className = "",
  onFocus,
  onBlur,
  onChange,
  autoFocus = false,
  tabIndex,
  id,
  disabled = false,
  minRows = 1,
}: CollaborativeTextEditorProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Create the TipTap editor
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Placeholder.configure({
        placeholder: placeholder || "",
        showOnlyWhenEditable: true,
        emptyNodeClass: "is-editor-empty",
      }),
      Collaboration.configure({
        document: doc,
        field: yText.toString(), // Use the Y.Text field name
      }),
      CollaborationCursor.configure({
        provider: {
          awareness,
        },
        user: {
          name: user.name,
          color: user.color,
        },
      }),
    ],
    editable: !disabled,
    autofocus: autoFocus,
    onFocus: () => {
      onFocus?.();
    },
    onBlur: () => {
      onBlur?.();
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getText());
    },
  });

  // Update user info when it changes
  useEffect(() => {
    if (editor) {
      editor.chain().focus().updateUser({ name: user.name, color: user.color }).run();
    }
  }, [editor, user.name, user.color]);

  // Handle disabled state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  // Focus handler for external focus calls
  const focus = useCallback(() => {
    editor?.commands.focus();
  }, [editor]);

  // Expose focus method via ref
  useEffect(() => {
    const container = editorContainerRef.current;
    if (container) {
      // @ts-expect-error Adding custom property for imperative focus
      container.focusEditor = focus;
    }
  }, [focus]);

  // Calculate min-height based on rows
  const minHeight = minRows > 1 ? `${minRows * 1.5}rem` : undefined;

  return (
    <div
      ref={editorContainerRef}
      id={id}
      className={`collaborative-text-editor ${className}`}
      tabIndex={tabIndex}
      style={{ minHeight }}
    >
      <EditorContent
        editor={editor}
        className="collaborative-text-editor-content"
      />
      <style>{`
        .collaborative-text-editor {
          width: 100%;
          position: relative;
        }

        .collaborative-text-editor-content {
          width: 100%;
        }

        .collaborative-text-editor-content .ProseMirror {
          outline: none;
          min-height: inherit;
        }

        .collaborative-text-editor-content .ProseMirror p {
          margin: 0;
        }

        .collaborative-text-editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }

        /* Collaboration cursor styles */
        .collaboration-cursor__caret {
          border-left: 1px solid currentColor;
          border-right: 1px solid currentColor;
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }

        .collaboration-cursor__label {
          border-radius: 3px 3px 3px 0;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          left: -1px;
          line-height: 1;
          padding: 2px 4px;
          position: absolute;
          top: -1.4em;
          user-select: none;
          white-space: nowrap;
          font-family: system-ui, -apple-system, sans-serif;
        }
      `}</style>
    </div>
  );
}

/**
 * Simple non-collaborative text editor using TipTap
 *
 * This is a fallback for when collaboration is not available.
 */
export function SimpleTextEditor({
  value,
  onChange,
  placeholder,
  className = "",
  onFocus,
  onBlur,
  autoFocus = false,
  tabIndex,
  id,
  disabled = false,
  minRows = 1,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  tabIndex?: number;
  id?: string;
  disabled?: boolean;
  minRows?: number;
}) {
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Placeholder.configure({
        placeholder: placeholder || "",
        showOnlyWhenEditable: true,
        emptyNodeClass: "is-editor-empty",
      }),
    ],
    content: value,
    editable: !disabled,
    autofocus: autoFocus,
    onFocus: () => {
      onFocus?.();
    },
    onBlur: () => {
      onBlur?.();
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getText());
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getText()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  // Handle disabled state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  const minHeight = minRows > 1 ? `${minRows * 1.5}rem` : undefined;

  return (
    <div
      id={id}
      className={`simple-text-editor ${className}`}
      tabIndex={tabIndex}
      style={{ minHeight }}
    >
      <EditorContent editor={editor} className="simple-text-editor-content" />
      <style>{`
        .simple-text-editor {
          width: 100%;
          position: relative;
        }

        .simple-text-editor-content {
          width: 100%;
        }

        .simple-text-editor-content .ProseMirror {
          outline: none;
          min-height: inherit;
        }

        .simple-text-editor-content .ProseMirror p {
          margin: 0;
        }

        .simple-text-editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}
