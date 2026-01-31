import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { requireApiAuth } from "@/middleware/apiAuth";
import { env } from "cloudflare:workers";
import { z } from "zod";
import {
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "./helpers/apiResponses";
import { PageRepository } from "@/server/repositories/PageRepository";
import { PageBlockRepository } from "@/server/repositories/PageBlockRepository";

// Request schema for reviewing a block
const reviewBlockRequestSchema = z.object({
  blockId: z.string(),
  question: z.string(),
  answer: z.string(),
  customInstructions: z.string().optional(), // User's custom review instructions/context
});

// Response schema that the LLM should produce
const reviewResponseSchema = z.object({
  suggestion: z.string().nullable(),
});

// Base system prompt - thought-provoking questions
const BASE_SYSTEM_PROMPT = `You ask thought-provoking questions to help someone think more deeply about their answer.

Your job is to ask 1-2 questions that provoke reflection. Focus on what's missing, unclear, or could be explored further.

GUIDELINES:
- Ask 1-2 focused questions, nothing more
- Questions should help the person think deeper, not criticize
- Focus on the most important gap or opportunity
- Don't nitpick grammar or phrasing

GOOD EXAMPLES:
- "What specific problem does this solve?"
- "How would you explain this to someone unfamiliar with the space?"
- "What's the strongest evidence you have for this?"

BAD EXAMPLES:
- Long explanations or feedback
- Bullet lists of improvements
- Statements like "Consider adding more detail about X"

Return JSON: { "suggestion": "Your 1-2 questions here" }
Return { "suggestion": null } if the answer is strong and complete.`;

// Timeout for AI review requests (1 minute)
const REVIEW_TIMEOUT_MS = 60_000;

export const Route = createFileRoute("/api/review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Authenticate the request
          const { session, response } = await requireApiAuth(request);

          if (response) {
            return response;
          }

          const userId = session!.sub;

          // Parse and validate request body
          const rawData = await request.json();
          const validationResult =
            await reviewBlockRequestSchema.safeParseAsync(rawData);

          if (!validationResult.success) {
            return validationErrorResponse(validationResult.error);
          }

          const { blockId, question, answer, customInstructions } =
            validationResult.data;

          // Verify block exists and user has access to its page
          const block = await PageBlockRepository.findById(blockId);
          if (!block) {
            return errorResponse({
              error: "Block not found",
              status: 404,
            });
          }

          const { page } = await PageRepository.findByIdWithAccess(
            block.pageId,
            userId,
          );
          if (!page) {
            return errorResponse({
              error: "Access denied",
              details: "You do not have access to this page.",
              status: 403,
            });
          }

          // Skip review for empty answers
          if (!answer || answer.trim() === "") {
            return errorResponse({
              error: "Cannot review empty answer",
              details: "Please provide an answer before requesting a review.",
              status: 400,
            });
          }

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
            abortController.abort();
          }, REVIEW_TIMEOUT_MS);

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

Return your feedback as JSON: { "suggestion": "Your markdown feedback here" }
Return { "suggestion": null } if the answer is solid and you have nothing meaningful to add.`,
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

          // Parse the LLM response
          let reviewData;
          try {
            // Try to extract JSON from the response
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error("No JSON found in response");
            }
            const parsed = JSON.parse(jsonMatch[0]);
            reviewData = reviewResponseSchema.parse(parsed);
          } catch (parseError) {
            console.error("[Review] Failed to parse LLM response:", parseError);
            return errorResponse({
              error: "Failed to parse review response",
              details:
                parseError instanceof Error
                  ? parseError.message
                  : "Unknown error",
              status: 500,
            });
          }

          return jsonResponse(
            {
              suggestion: reviewData.suggestion,
            },
            { status: 200 },
          );
        } catch (error) {
          // Check if this was a timeout/abort error
          if (error instanceof Error && error.name === "AbortError") {
            return errorResponse({
              error: "Review request timed out",
              details: `The AI took too long to respond (>${REVIEW_TIMEOUT_MS / 1000}s). Please try again.`,
              status: 504,
            });
          }

          console.error("[Review] Error:", error);
          return errorResponse({
            error: "Failed to process review request",
            details: error instanceof Error ? error.message : "Unknown error",
            status: 500,
          });
        }
      },
    },
  },
});
