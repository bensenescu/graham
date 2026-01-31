export const OPENAI_TRANSCRIBE_URL =
  "https://api.openai.com/v1/audio/transcriptions";

export const DEFAULT_PAGE_REVIEW_MODEL = "openai-gpt-5.2-high";

export const DEFAULT_PAGE_REVIEW_PROMPT =
  "Review this answer. Ask probing questions to help strengthen the response.";

export const DEFAULT_PRACTICE_CRITERIA = [
  "Confidence",
  "Completeness",
  "Answer Quality",
];

export const AI_REVIEW_BATCH_SIZE = 3;
