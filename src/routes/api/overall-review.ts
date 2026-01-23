import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  authenticateRequest,
  getAuthConfig,
} from "@every-app/sdk/tanstack/server";
import { env } from "cloudflare:workers";
import { z } from "zod";

// Request schema for overall review
const overallReviewRequestSchema = z.object({
  pageId: z.string(),
  blocks: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    }),
  ),
  customInstructions: z.string().optional(), // User's custom review instructions/context
});

// Base system prompt for overall review
const BASE_SYSTEM_PROMPT = `You are an expert application reviewer. Your job is to evaluate an entire application holistically, considering all questions and answers together.

You will receive all question/answer pairs from an application. Provide a comprehensive narrative review that:
1. Assesses the overall quality and coherence of the application
2. Identifies patterns across answers (both strengths and weaknesses)
3. Evaluates how well the answers work together to present a compelling case
4. Highlights the most critical areas for improvement
5. Notes any inconsistencies between answers

Write your review as a clear, professional narrative (2-4 paragraphs). Be direct and constructive, focusing on actionable insights that will help improve the application as a whole.

IMPORTANT: Write ONLY the review text directly. Do not wrap it in JSON or any other format. Just write the narrative review.`;

export const Route = createFileRoute("/api/overall-review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        const requestId = crypto.randomUUID().slice(0, 8);

        console.log(
          `[OverallReview ${requestId}] Starting overall review request`,
        );

        try {
          // Authenticate the request
          console.log(`[OverallReview ${requestId}] Authenticating request...`);
          const authConfig = getAuthConfig();
          const session = await authenticateRequest(authConfig, request);
          console.log(
            `[OverallReview ${requestId}] Authentication completed in ${Date.now() - startTime}ms`,
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
            await overallReviewRequestSchema.safeParseAsync(rawData);

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

          const { pageId, blocks, customInstructions } = validationResult.data;

          // Check if there are any answers to review
          const answeredBlocks = blocks.filter(
            (b) => b.answer && b.answer.trim() !== "",
          );

          if (answeredBlocks.length === 0) {
            console.log(
              `[OverallReview ${requestId}] No answers to review for page ${pageId}`,
            );
            return new Response(
              JSON.stringify({
                error: "No answers to review",
                details:
                  "Please provide answers to at least one question before requesting an overall review.",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          console.log(
            `[OverallReview ${requestId}] Processing page ${pageId}, ${answeredBlocks.length} answered questions`,
          );

          // Build the system prompt: base prompt + optional custom instructions
          let finalSystemPrompt = BASE_SYSTEM_PROMPT;
          if (customInstructions) {
            finalSystemPrompt += `\n\n## Additional Context & Instructions\n${customInstructions}`;
          }

          // Format all Q&A pairs for the prompt
          const qaContent = answeredBlocks
            .map(
              (block, index) =>
                `**Question ${index + 1}:** ${block.question}\n**Answer:** ${block.answer}`,
            )
            .join("\n\n---\n\n");

          // Create OpenAI provider instance
          const openaiProvider = createOpenAI({
            apiKey: env.OPENAI_API_KEY,
          });

          console.log(
            `[OverallReview ${requestId}] Starting AI stream at ${Date.now() - startTime}ms...`,
          );

          // Stream the overall review using GPT-5.2
          const result = streamText({
            model: openaiProvider("gpt-5.2"),
            system: finalSystemPrompt,
            messages: [
              {
                role: "user",
                content: `Please provide an overall review of the following application with ${answeredBlocks.length} question(s) answered:

${qaContent}`,
              },
            ],
            providerOptions: {
              openai: {
                reasoningEffort: "high",
              },
            },
          });

          console.log(
            `[OverallReview ${requestId}] Returning streaming response`,
          );

          // Return the streaming text response
          return result.toTextStreamResponse();
        } catch (error) {
          const totalTime = Date.now() - startTime;

          console.error(
            `[OverallReview ${requestId}] Overall review error after ${totalTime}ms:`,
            error,
          );
          return new Response(
            JSON.stringify({
              error: "Failed to process overall review request",
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
