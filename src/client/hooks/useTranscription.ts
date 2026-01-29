import { useState, useCallback } from "react";
import { authenticatedFetch } from "@every-app/sdk/core";

export type TranscriptionState =
  | "idle"
  | "transcribing"
  | "completed"
  | "failed";

interface TranscriptionAPIResponse {
  transcription: string;
  error?: string;
}

interface UseTranscriptionReturn {
  /** Current transcription state */
  state: TranscriptionState;
  /** The transcribed text */
  transcription: string | null;
  /** Error message if transcription failed */
  error: string | null;
  /** Transcribe an audio blob */
  transcribe: (audioBlob: Blob) => Promise<string | null>;
  /** Reset to idle state */
  reset: () => void;
}

/**
 * Hook for transcribing audio using the /api/transcribe endpoint.
 */
export function useTranscription(): UseTranscriptionReturn {
  const [state, setState] = useState<TranscriptionState>("idle");
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transcribe = useCallback(
    async (audioBlob: Blob): Promise<string | null> => {
      setState("transcribing");
      setError(null);
      setTranscription(null);

      try {
        const formData = new FormData();

        // Create a file from the blob with appropriate extension
        const extension = audioBlob.type.includes("webm") ? "webm" : "mp4";
        const file = new File([audioBlob], `recording.${extension}`, {
          type: audioBlob.type,
        });
        formData.append("audio", file);

        // Note: authenticatedFetch handles auth headers automatically
        // but we need to pass FormData directly without Content-Type header
        // (browser will set multipart/form-data with boundary)
        const response = await authenticatedFetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as TranscriptionAPIResponse;

        if (!response.ok) {
          throw new Error(data.error || "Transcription failed");
        }

        setTranscription(data.transcription);
        setState("completed");
        return data.transcription;
      } catch (err) {
        console.error("Transcription error:", err);
        const message =
          err instanceof Error ? err.message : "Transcription failed";
        setError(message);
        setState("failed");
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState("idle");
    setTranscription(null);
    setError(null);
  }, []);

  return {
    state,
    transcription,
    error,
    transcribe,
    reset,
  };
}
