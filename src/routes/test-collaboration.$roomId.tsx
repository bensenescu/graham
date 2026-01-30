import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import * as Y from "yjs";
import type { WebsocketProvider } from "y-websocket";
import { useCollab } from "@/client/hooks/useCollab";

export const Route = createFileRoute("/test-collaboration/$roomId")({
  component: TestCollaborationPage,
});

function TestCollaborationPage() {
  const { roomId } = Route.useParams();
  const {
    doc,
    provider,
    connectionState,
    isSynced,
    hasSyncedOnce,
    reconnect,
    userInfo,
  } = useCollab({
    url: "/api/test-collaboration",
    roomName: roomId,
  });

  const connectionLabel = useMemo(() => {
    if (connectionState === "connected" && isSynced) return "Connected";
    if (connectionState === "connected" && !isSynced) return "Syncing...";
    if (connectionState === "connecting") return "Connecting";
    if (connectionState === "error") return "Error";
    return "Disconnected";
  }, [connectionState, isSynced]);

  // Only render editor after the first successful sync
  const isReady = doc && provider && hasSyncedOnce;

  // Debug: log awareness state changes
  useEffect(() => {
    if (!provider) return;

    console.debug("[test-collab] provider ready", {
      roomId,
      userName: userInfo.userName,
      userId: userInfo.userId,
      localState: provider.awareness.getLocalState(),
      allStates: Array.from(provider.awareness.getStates().entries()),
    });

    const handleAwarenessChange = () => {
      console.debug("[test-collab] awareness change", {
        roomId,
        allStates: Array.from(provider.awareness.getStates().entries()),
      });
    };

    provider.awareness.on("change", handleAwarenessChange);
    return () => {
      provider.awareness.off("change", handleAwarenessChange);
    };
  }, [provider, roomId, userInfo]);

  return (
    <div className="min-h-screen bg-base-200 px-6 py-10">
      <div className="max-w-2xl mx-auto bg-base-100 border border-base-300 rounded-lg p-6">
        <h1 className="text-xl font-semibold text-base-content">
          Test Collaboration
        </h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-base-content/60">
          <span>Room: {roomId}</span>
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
              <CollabEditor
                doc={doc!}
                provider={provider!}
                userName={userInfo.userName}
                userColor={userInfo.userColor}
              />
            ) : (
              <div className="min-h-[280px] flex items-center justify-center text-base-content/50">
                {connectionState === "error"
                  ? "Connection error"
                  : connectionState === "connected"
                    ? "Syncing..."
                    : connectionState === "connecting"
                      ? "Connecting..."
                      : "Waiting for session..."}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .collab-caret {
          border-left: 2px solid;
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }

        .collab-caret-label {
          border-radius: 4px 4px 4px 0;
          color: #fff;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 500;
          left: -2px;
          line-height: 1;
          padding: 3px 6px;
          position: absolute;
          top: -1.5em;
          user-select: none;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}

interface CollabEditorProps {
  doc: Y.Doc;
  provider: WebsocketProvider;
  userName: string;
  userColor: string;
}

function CollabEditor({
  doc,
  provider,
  userName,
  userColor,
}: CollabEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      Placeholder.configure({
        placeholder: "Type here...",
      }),
      Collaboration.configure({
        document: doc,
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
