import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";
import * as Y from "yjs";
import type { WebsocketProvider } from "y-websocket";
import { useCollaborationUser } from "@/client/hooks/useCollaborationUser";
import { useSimpleCollab } from "@/client/hooks/useSimpleCollab";

export const Route = createFileRoute("/collab-test/$blockId")({
  component: CollabTestPage,
});

function CollabTestPage() {
  const { blockId } = Route.useParams();
  const { userInfo } = useCollaborationUser();
  const { doc, provider, connectionState, reconnect } = useSimpleCollab({
    docId: blockId,
    userInfo,
    enabled: true,
  });

  const connectionLabel = useMemo(() => {
    if (connectionState === "connected") return "Connected";
    if (connectionState === "connecting") return "Connecting";
    if (connectionState === "error") return "Error";
    return "Disconnected";
  }, [connectionState]);

  // Only render editor when provider is ready AND synced
  const isReady = provider && connectionState === "connected";

  return (
    <div className="min-h-screen bg-base-200 px-6 py-10">
      <div className="max-w-2xl mx-auto bg-base-100 border border-base-300 rounded-lg p-6">
        <h1 className="text-xl font-semibold text-base-content">Collab Test</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-base-content/60">
          <span>Block: {blockId}</span>
          <span>Status: {connectionLabel}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={reconnect}
          >
            Reconnect
          </button>
        </div>

        <div className="mt-6">
          <div className="border border-base-300 rounded-md p-3 bg-base-100">
            {isReady ? (
              <CollabEditor doc={doc} provider={provider} />
            ) : (
              <div className="min-h-[280px] flex items-center justify-center text-base-content/50">
                {connectionState === "error" ? "Connection error" : "Connecting..."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CollabEditorProps {
  doc: Y.Doc;
  provider: WebsocketProvider;
}

function CollabEditor({ doc }: CollabEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // @ts-expect-error - history exists at runtime, disabling for collab
        history: false,
      }),
      Placeholder.configure({
        placeholder: "Type here...",
      }),
      Collaboration.configure({
        document: doc,
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[280px] outline-none focus:outline-none",
      },
    },
  });

  return <EditorContent editor={editor} />;
}
