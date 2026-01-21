import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

interface EditorProps {
  content: string;
  onUpdate: (content: string) => void;
  editable?: boolean;
}

export function Editor({ content, onUpdate, editable = true }: EditorProps) {
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor(
    {
      extensions: [StarterKit],
      content,
      editable,
      editorProps: {
        attributes: {
          class:
            "prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[300px] p-4",
        },
      },
      onUpdate: ({ editor }) => {
        // Debounce updates to avoid too many saves
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
          const html = editor.getHTML();
          onUpdate(html);
        }, 500);
      },
    },
    [onUpdate],
  );

  // Update content when it changes externally (but only if different)
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  if (!editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-base-300 p-2 flex flex-wrap gap-1 bg-base-100">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`btn btn-sm btn-ghost ${editor.isActive("bold") ? "btn-active" : ""}`}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`btn btn-sm btn-ghost ${editor.isActive("italic") ? "btn-active" : ""}`}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`btn btn-sm btn-ghost ${editor.isActive("strike") ? "btn-active" : ""}`}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`btn btn-sm btn-ghost ${editor.isActive("code") ? "btn-active" : ""}`}
          title="Code"
        >
          <code>&lt;/&gt;</code>
        </button>
        <div className="divider divider-horizontal mx-1"></div>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={`btn btn-sm btn-ghost ${editor.isActive("heading", { level: 1 }) ? "btn-active" : ""}`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`btn btn-sm btn-ghost ${editor.isActive("heading", { level: 2 }) ? "btn-active" : ""}`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`btn btn-sm btn-ghost ${editor.isActive("heading", { level: 3 }) ? "btn-active" : ""}`}
          title="Heading 3"
        >
          H3
        </button>
        <div className="divider divider-horizontal mx-1"></div>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`btn btn-sm btn-ghost ${editor.isActive("bulletList") ? "btn-active" : ""}`}
          title="Bullet List"
        >
          &bull;
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`btn btn-sm btn-ghost ${editor.isActive("orderedList") ? "btn-active" : ""}`}
          title="Ordered List"
        >
          1.
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`btn btn-sm btn-ghost ${editor.isActive("blockquote") ? "btn-active" : ""}`}
          title="Blockquote"
        >
          &ldquo;
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`btn btn-sm btn-ghost ${editor.isActive("codeBlock") ? "btn-active" : ""}`}
          title="Code Block"
        >
          {"{ }"}
        </button>
        <div className="divider divider-horizontal mx-1"></div>
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="btn btn-sm btn-ghost"
          title="Undo"
        >
          &#8630;
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="btn btn-sm btn-ghost"
          title="Redo"
        >
          &#8631;
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto bg-base-100">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
