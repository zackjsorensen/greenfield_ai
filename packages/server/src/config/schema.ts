import { z } from 'zod';

const modelConfigSchema = z.object({
  model: z.string().min(1),
});

export const appConfigSchema = z.object({
  server: z.object({
    host: z.string().min(1),
    port: z.number().int().positive(),
    corsOrigins: z.array(z.string().min(1)).min(1),
    serveStatic: z.boolean().default(false),
  }),
  apiKeys: z.object({
    openai: z.string(),
    gemini: z.string(),
  }),
  providers: z.object({
    transcription: z.object({
      active: z.string().min(1),
      openai: modelConfigSchema.optional(),
      gemini: modelConfigSchema.optional(),
    }),
    translation: z.object({
      active: z.string().min(1),
      gemini: modelConfigSchema.optional(),
      openai: modelConfigSchema.optional(),
    }),
  }),
  audio: z.object({
    maxUploadBytes: z.number().int().positive(),
  }),
  languages: z.object({
    default: z.string().min(1),
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
