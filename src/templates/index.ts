import { generateSortKeyAtIndex } from "@/client/lib/fractional-indexing";

// Template question definition
export interface TemplateQuestion {
  question: string;
  section?: string;
  placeholder?: string;
}

// Template definition
export interface Template {
  id: string;
  name: string;
  description: string;
  questions: TemplateQuestion[];
}

// YC Application Template - Open-ended questions only
// (Excludes founder video and yes/no questions)
export const ycApplicationTemplate: Template = {
  id: "yc-application",
  name: "YC Application",
  description: "Y Combinator startup application questions",
  questions: [
    // Founders
    {
      question:
        "Who writes code, or does other technical work on your product? Was any of it done by a non-founder? Please explain.",
      section: "Founders",
    },
    {
      question: "Are you looking for a cofounder?",
      section: "Founders",
    },

    // Company
    {
      question: "Describe what your company does in 50 characters or less.",
      section: "Company",
    },
    {
      question:
        "What is your company going to make? Please describe your product and what it does or will do.",
      section: "Company",
    },
    {
      question:
        "Where do you live now, and where would the company be based after YC? Explain your decision regarding location.",
      section: "Company",
    },

    // Progress
    {
      question: "How far along are you?",
      section: "Progress",
    },
    {
      question:
        "How long have each of you been working on this? How much of that has been full-time? Please explain.",
      section: "Progress",
    },
    {
      question:
        "What tech stack are you using, or planning to use, to build this product? Include AI models and AI coding tools you use.",
      section: "Progress",
    },
    {
      question:
        "If you are applying with the same idea as a previous batch, did anything change? If you applied with a different idea, why did you pivot and what did you learn from the last idea?",
      section: "Progress",
    },
    {
      question:
        'If you have already participated or committed to participate in an incubator, "accelerator" or "pre-accelerator" program, please tell us about it.',
      section: "Progress",
    },

    // Idea
    {
      question:
        "Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you're making?",
      section: "Idea",
    },
    {
      question:
        "Who are your competitors? What do you understand about your business that they don't?",
      section: "Idea",
    },
    {
      question:
        "How do or will you make money? How much could you make? (We realize you can't know precisely, but give your best estimate)",
      section: "Idea",
    },
    {
      question: "Which category best applies to your company?",
      section: "Idea",
    },
    {
      question:
        "If you had any other ideas you considered applying with, please list them. One may be something we've been waiting for. Often when we fund people it's to do something they list here and not in the main application.",
      section: "Idea",
    },

    // Curious
    {
      question:
        "What convinced you to apply to Y Combinator? Did someone encourage you to apply? Have you been to any YC events?",
      section: "Curious",
    },
  ],
};

// All available templates
export const templates: Template[] = [ycApplicationTemplate];

// Get a template by ID
export function getTemplateById(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

// Convert template questions to page blocks format
export function templateToBlocks(template: Template) {
  return template.questions.map((q, index) => ({
    id: crypto.randomUUID(),
    question: q.question,
    answer: "",
    sortKey: generateSortKeyAtIndex(index, template.questions.length),
  }));
}
