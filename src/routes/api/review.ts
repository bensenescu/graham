import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  authenticateRequest,
  getAuthConfig,
} from "@every-app/sdk/tanstack/server";
import { env } from "cloudflare:workers";
import { z } from "zod";

// Request schema for reviewing a block
const reviewBlockRequestSchema = z.object({
  blockId: z.string(),
  question: z.string(),
  answer: z.string(),
  customInstructions: z.string().optional(), // User's custom review instructions/context
});

// Response schema that the LLM should produce
const reviewResponseSchema = z.object({
  strengths: z.array(z.string()).max(1),
  improvements: z.array(z.string()).max(2),
  tips: z.array(z.string()).max(1).optional(),
});

// Base system prompt - generic reviewer that can be customized
const BASE_SYSTEM_PROMPT = `You are an expert application reviewer. Your job is to evaluate answers to application questions and provide constructive feedback.

For each question and answer pair, evaluate the response and provide:
1. Strengths: The single most important thing the answer does well (exactly 1 bullet point)
2. Improvements: The most critical issues that need to be fixed (exactly 2 bullet points, prioritized by importance)
3. Tips: One actionable suggestion for making the answer stronger (exactly 1 bullet point, optional - only include if there's a genuinely useful tip)

Be direct and constructive. Focus on actionable feedback that will help improve the answer.`;

// Timeout for AI review requests (1 minute)
const REVIEW_TIMEOUT_MS = 60_000;

export const Route = createFileRoute("/api/review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        const requestId = crypto.randomUUID().slice(0, 8);

        console.log(`[Review ${requestId}] Starting review request`);

        try {
          // Authenticate the request
          console.log(`[Review ${requestId}] Authenticating request...`);
          const authConfig = getAuthConfig();
          const session = await authenticateRequest(authConfig, request);
          console.log(
            `[Review ${requestId}] Authentication completed in ${Date.now() - startTime}ms`,
          );

          if (!session || !session.sub) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Parse and validate request body
          const rawData = await request.json();
          const validationResult =
            await reviewBlockRequestSchema.safeParseAsync(rawData);

          if (!validationResult.success) {
            console.error("Validation errors:", validationResult.error.issues);
            const firstError = validationResult.error.issues[0];
            return new Response(
              JSON.stringify({
                error: firstError?.message || "Invalid request",
                path: firstError?.path?.join("."),
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const { blockId, question, answer, customInstructions } =
            validationResult.data;

          console.log(
            `[Review ${requestId}] Processing block ${blockId}, question length: ${question.length}, answer length: ${answer?.length || 0}`,
          );

          // Build the system prompt: base prompt + optional custom instructions
          let finalSystemPrompt = BASE_SYSTEM_PROMPT;
          if (customInstructions) {
            finalSystemPrompt += `\n\n## Additional Context & Instructions\n${customInstructions}`;
          }

          // Create OpenAI provider instance
          const openaiProvider = createOpenAI({
            apiKey: env.OPENAI_API_KEY,
          });

          // Create abort controller for timeout
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log(
              `[Review ${requestId}] Timeout reached after ${REVIEW_TIMEOUT_MS}ms, aborting...`,
            );
            abortController.abort();
          }, REVIEW_TIMEOUT_MS);

          console.log(
            `[Review ${requestId}] Starting AI generation at ${Date.now() - startTime}ms...`,
          );

          let result;
          try {
            // Generate the review using GPT-5.2
            result = await generateText({
              model: openaiProvider("gpt-5.2"),
              system: finalSystemPrompt,
              messages: [
                {
                  role: "user",
                  content: `Please review the following question and answer:

**Question:** ${question}

**Answer:** ${answer || "(No answer provided)"}

Provide your evaluation in JSON format with EXACTLY this structure:
{
  "strengths": ["exactly 1 string - the most important strength"],
  "improvements": ["exactly 2 strings - the most critical issues, prioritized"],
  "tips": ["exactly 1 string - one actionable suggestion"] (optional, omit if not needed)
}

IMPORTANT: Keep feedback concise. Strengths must have exactly 1 item. Improvements must have exactly 2 items. Tips must have exactly 1 item or be omitted entirely.`,
                },
              ],
              providerOptions: {
                openai: {
                  reasoningEffort: "high",
                },
              },
              abortSignal: abortController.signal,
            });
          } finally {
            clearTimeout(timeoutId);
          }

          console.log(
            `[Review ${requestId}] AI generation completed in ${Date.now() - startTime}ms, response length: ${result.text.length}`,
          );

          // Parse the LLM response
          console.log(`[Review ${requestId}] Parsing LLM response...`);
          let reviewData;
          try {
            // Try to extract JSON from the response
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error("No JSON found in response");
            }
            const parsed = JSON.parse(jsonMatch[0]);
            reviewData = reviewResponseSchema.parse(parsed);
            console.log(`[Review ${requestId}] Response parsed successfully`);
          } catch (parseError) {
            console.error(
              `[Review ${requestId}] Failed to parse LLM response:`,
              parseError,
            );
            console.error(`[Review ${requestId}] Raw response:`, result.text);
            return new Response(
              JSON.stringify({
                error: "Failed to parse review response",
                details:
                  parseError instanceof Error
                    ? parseError.message
                    : "Unknown error",
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // Return the review (without blockId - client already has it)
          const totalTime = Date.now() - startTime;
          console.log(
            `[Review ${requestId}] Review completed successfully in ${totalTime}ms`,
          );

          return new Response(
            JSON.stringify({
              strengths: reviewData.strengths,
              improvements: reviewData.improvements,
              tips: reviewData.tips || null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          const totalTime = Date.now() - startTime;

          // Check if this was a timeout/abort error
          if (error instanceof Error && error.name === "AbortError") {
            console.error(
              `[Review ${requestId}] Request timed out after ${totalTime}ms`,
            );
            return new Response(
              JSON.stringify({
                error: "Review request timed out",
                details: `The AI took too long to respond (>${REVIEW_TIMEOUT_MS / 1000}s). Please try again.`,
              }),
              {
                status: 504,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          console.error(
            `[Review ${requestId}] Review error after ${totalTime}ms:`,
            error,
          );
          return new Response(
            JSON.stringify({
              error: "Failed to process review request",
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
