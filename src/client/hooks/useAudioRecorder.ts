import { useState, useRef, useCallback } from "react";

export type RecordingState = "idle" | "recording" | "stopped";

interface UseAudioRecorderOptions {
  /** Minimum recording duration in seconds (default: 2) */
  minDuration?: number;
  /** Called when recording is too short */
  onTooShort?: () => void;
}

interface UseAudioRecorderReturn {
  /** Current recording state */
  state: RecordingState;
  /** Recording duration in seconds */
  duration: number;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording and get the audio blob */
  stopRecording: () => Promise<Blob | null>;
  /** Reset the recorder to idle state */
  reset: () => void;
  /** Error message if any */
  error: string | null;
  /** Whether microphone permission is granted */
  hasPermission: boolean | null;
}

/**
 * Hook for recording audio using the browser's MediaRecorder API.
 * Returns WebM/Opus audio blobs suitable for transcription.
 */
export function useAudioRecorder(
  options: UseAudioRecorderOptions = {},
): UseAudioRecorderReturn {
  const { minDuration = 2, onTooShort } = options;

  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setHasPermission(true);
      streamRef.current = stream;

      // Create MediaRecorder with best available format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setState("recording");
      setDuration(0);

      // Start duration timer
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
      }, 100);
    } catch (err) {
      console.error("Failed to start recording:", err);

      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setHasPermission(false);
          setError(
            "Microphone permission denied. Please allow microphone access to record.",
          );
        } else if (err.name === "NotFoundError") {
          setError("No microphone found. Please connect a microphone.");
        } else {
          setError(`Microphone error: ${err.message}`);
        }
      } else {
        setError("Failed to start recording. Please try again.");
      }

      cleanup();
      setState("idle");
    }
  }, [cleanup]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        cleanup();
        setState("idle");
        resolve(null);
        return;
      }

      // Check duration
      const finalDuration = Math.floor(
        (Date.now() - startTimeRef.current) / 1000,
      );
      setDuration(finalDuration);

      if (finalDuration < minDuration) {
        onTooShort?.();
        cleanup();
        setState("idle");
        setError(
          `Recording too short. Please record for at least ${minDuration} seconds.`,
        );
        resolve(null);
        return;
      }

      // Stop recording and wait for final data
      mediaRecorder.onstop = () => {
        // Clear the timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Create the final blob
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setState("stopped");
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, [minDuration, onTooShort, cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setState("idle");
    setDuration(0);
    setError(null);
  }, [cleanup]);

  return {
    state,
    duration,
    startRecording,
    stopRecording,
    reset,
    error,
    hasPermission,
  };
}
