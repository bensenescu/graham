import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/middleware/apiAuth";
import { env } from "cloudflare:workers";
import { OPENAI_TRANSCRIBE_URL } from "@/constants/defaults";

// Timeout for transcription requests (2 minutes for longer recordings)
const TRANSCRIBE_TIMEOUT_MS = 120_000;

// Max file size: 25MB (OpenAI Whisper limit)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        const requestId = crypto.randomUUID().slice(0, 8);

        console.log(`[Transcribe ${requestId}] Starting transcription request`);

        try {
          // Authenticate the request
          console.log(`[Transcribe ${requestId}] Authenticating request...`);
          const authStart = Date.now();
          const { response } = await requireApiAuth(request);
          console.log(
            `[Transcribe ${requestId}] Authentication completed in ${Date.now() - authStart}ms`,
          );

          if (response) {
            return response;
          }

          // Parse multipart form data
          const formData = await request.formData();
          const audioFile = formData.get("audio");

          if (!audioFile || !(audioFile instanceof File)) {
            return new Response(
              JSON.stringify({ error: "No audio file provided" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // Check file size
          if (audioFile.size > MAX_FILE_SIZE) {
            return new Response(
              JSON.stringify({
                error: "File too large",
                details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          console.log(
            `[Transcribe ${requestId}] Processing audio file: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`,
          );

          // Create abort controller for timeout
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log(
              `[Transcribe ${requestId}] Timeout reached after ${TRANSCRIBE_TIMEOUT_MS}ms, aborting...`,
            );
            abortController.abort();
          }, TRANSCRIBE_TIMEOUT_MS);

          console.log(
            `[Transcribe ${requestId}] Starting Whisper API call at ${Date.now() - startTime}ms...`,
          );

          try {
            // Prepare form data for OpenAI Whisper API
            const whisperFormData = new FormData();
            whisperFormData.append("file", audioFile);
            whisperFormData.append("model", "whisper-1");
            whisperFormData.append("language", "en"); // Optimize for English

            // Call OpenAI Whisper API
            const whisperResponse = await fetch(OPENAI_TRANSCRIBE_URL, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
              },
              body: whisperFormData,
              signal: abortController.signal,
            });

            clearTimeout(timeoutId);

            if (!whisperResponse.ok) {
              const errorText = await whisperResponse.text();
              console.error(
                `[Transcribe ${requestId}] Whisper API error: ${whisperResponse.status}`,
                errorText,
              );
              return new Response(
                JSON.stringify({
                  error: "Transcription failed",
                  details: `OpenAI API returned status ${whisperResponse.status}`,
                }),
                {
                  status: 500,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }

            const result = (await whisperResponse.json()) as { text: string };

            const totalTime = Date.now() - startTime;
            console.log(
              `[Transcribe ${requestId}] Transcription completed in ${totalTime}ms, text length: ${result.text.length}`,
            );

            return new Response(
              JSON.stringify({
                transcription: result.text,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            );
          } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
          }
        } catch (error) {
          const totalTime = Date.now() - startTime;

          // Check if this was a timeout/abort error
          if (error instanceof Error && error.name === "AbortError") {
            console.error(
              `[Transcribe ${requestId}] Request timed out after ${totalTime}ms`,
            );
            return new Response(
              JSON.stringify({
                error: "Transcription request timed out",
                details: `The transcription took too long (>${TRANSCRIBE_TIMEOUT_MS / 1000}s). Please try again with a shorter recording.`,
              }),
              {
                status: 504,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          console.error(
            `[Transcribe ${requestId}] Transcription error after ${totalTime}ms:`,
            error,
          );
          return new Response(
            JSON.stringify({
              error: "Failed to process transcription request",
              details: error instanceof Error ? error.message : "Unknown error",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
