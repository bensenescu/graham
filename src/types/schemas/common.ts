import { z } from "zod";

export const pageIdInputSchema = z.object({ pageId: z.string().uuid() });
export const sessionIdInputSchema = z.object({ sessionId: z.string().uuid() });
export const idInputSchema = z.object({ id: z.string() });
