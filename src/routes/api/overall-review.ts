import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { requireApiAuth } from "@/middleware/apiAuth";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { errorResponse, validationErrorResponse } from "./helpers/apiResponses";
import { PageRepository } from "@/server/repositories/PageRepository";

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
const BASE_SYSTEM_PROMPT = `You provide feedback on a set of question/answer pairs, looking at them holistically.

Give concise, actionable feedback that:
1. Highlights strengths and weaknesses across the answers
2. Points out gaps or inconsistencies
3. Asks thought-provoking questions where helpful

Keep it concise—3 paragraphs at most, shorter is fine.

IMPORTANT: Write ONLY the feedback directly. Do not wrap in JSON or any other format.`;

export const Route = createFileRoute("/api/overall-review")({
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
            await overallReviewRequestSchema.safeParseAsync(rawData);

          if (!validationResult.success) {
            return validationErrorResponse(validationResult.error);
          }

          const { pageId, blocks, customInstructions } = validationResult.data;

          // Verify user has access to the page
          const { page } = await PageRepository.findByIdWithAccess(
            pageId,
            userId,
          );
          if (!page) {
            return errorResponse({
              error: "Access denied",
              details: "You do not have access to this page.",
              status: 403,
            });
          }

          // Check if there are any answers to review
          const answeredBlocks = blocks.filter(
            (b) => b.answer && b.answer.trim() !== "",
          );

          if (answeredBlocks.length === 0) {
            return errorResponse({
              error: "No answers to review",
              details:
                "Please provide answers to at least one question before requesting an overall review.",
              status: 400,
            });
          }

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

          // Stream the overall review using GPT-5.2 with reasoning summaries
          const result = streamText({
            model: openaiProvider.responses("gpt-5.2"),
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
                reasoningSummary: "detailed", // Stream thinking notes
              },
            },
          });

          // Create a custom stream that sends reasoning and text parts separately
          // Format: JSON lines with { type: "reasoning" | "text", content: string }
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              try {
                for await (const part of result.fullStream) {
                  if (part.type === "reasoning-delta") {
                    // Send reasoning chunk
                    const data = JSON.stringify({
                      type: "reasoning",
                      content: part.text,
                    });
                    controller.enqueue(encoder.encode(data + "\n"));
                  } else if (part.type === "text-delta") {
                    // Send text chunk
                    const data = JSON.stringify({
                      type: "text",
                      content: part.text,
                    });
                    controller.enqueue(encoder.encode(data + "\n"));
                  }
                }
                controller.close();
              } catch (error) {
                console.error("[OverallReview] Stream error:", error);
                controller.error(error);
              }
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Transfer-Encoding": "chunked",
            },
          });
        } catch (error) {
          console.error("[OverallReview] Error:", error);
          return errorResponse({
            error: "Failed to process overall review request",
            details: error instanceof Error ? error.message : "Unknown error",
            status: 500,
          });
        }
      },
    },
  },
});
