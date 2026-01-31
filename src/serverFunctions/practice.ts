import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@every-app/sdk/tanstack";
import { PracticeService } from "@/server/services/PracticeService";
import {
  createPracticeCriterionSchema,
  updatePracticeCriterionSchema,
  deletePracticeCriterionSchema,
  updatePracticePoolSettingsSchema,
  createPracticeSessionSchema,
  updatePracticeSessionSchema,
  createPracticeAnswerSchema,
  updatePracticeAnswerSchema,
  deletePracticeAnswerSchema,
  batchCreatePracticeAnswerRatingsSchema,
} from "@/types/schemas/practice";
import {
  pageIdInputSchema,
  sessionIdInputSchema,
} from "@/types/schemas/common";

// === Criteria ===

export const getPracticeCriteria = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    return PracticeService.getCriteria(context.userId);
  });

export const createPracticeCriterion = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => createPracticeCriterionSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.createCriterion(context.userId, data);
  });

export const updatePracticeCriterion = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => updatePracticeCriterionSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.updateCriterion(context.userId, data);
  });

export const deletePracticeCriterion = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => deletePracticeCriterionSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.deleteCriterion(context.userId, data);
  });

// === Pool Settings ===

export const getPracticePoolSettings = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => pageIdInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.getPoolSettings(context.userId, data.pageId);
  });

export const updatePracticePoolSettings = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    updatePracticePoolSettingsSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    return PracticeService.updatePoolSettings(context.userId, data);
  });

export const getPracticePool = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => pageIdInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.getPracticePool(context.userId, data.pageId);
  });

// === Sessions ===

export const getIncompleteSession = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => pageIdInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.getIncompleteSession(context.userId, data.pageId);
  });

export const getPracticeSession = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => sessionIdInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.getSession(context.userId, data.sessionId);
  });

export const getPracticeSessions = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => pageIdInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.getSessions(context.userId, data.pageId);
  });

export const createPracticeSession = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => createPracticeSessionSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.createSession(context.userId, data);
  });

export const updatePracticeSession = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => updatePracticeSessionSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.updateSession(context.userId, data);
  });

export const deletePracticeSession = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => sessionIdInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.deleteSession(context.userId, data.sessionId);
  });

// === Answers ===

export const createPracticeAnswer = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => createPracticeAnswerSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.createAnswer(context.userId, data);
  });

export const updatePracticeAnswer = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => updatePracticeAnswerSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.updateAnswer(context.userId, data);
  });

export const deletePracticeAnswer = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => deletePracticeAnswerSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.deleteAnswer(context.userId, data);
  });

// === Ratings ===

export const savePracticeAnswerRatings = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    batchCreatePracticeAnswerRatingsSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    return PracticeService.saveRatings(context.userId, data);
  });

// === Statistics ===

export const getPracticeBlockStats = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => pageIdInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.getBlockStats(context.userId, data.pageId);
  });

export const getLastPracticeDate = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => pageIdInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PracticeService.getLastPracticeDate(context.userId, data.pageId);
  });
