import { z } from 'zod';
import { isLanguageCode } from './languages.js';

const languageCodeSchema = z.string().refine(isLanguageCode, {
  message: 'Unsupported target language',
});

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

export const publicConfigResponseSchema = z.object({
  languages: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      nativeLabel: z.string(),
    }),
  ),
  defaultLanguage: z.string(),
  providers: z.object({
    transcription: z.string(),
    translation: z.string(),
  }),
});

export const transcribeResponseSchema = z.object({
  text: z.string(),
  detectedLanguage: z.string().optional(),
  provider: z.string(),
  model: z.string(),
});

export const translateRequestSchema = z.object({
  text: z.string().min(1),
  targetLanguage: languageCodeSchema,
  sourceLanguage: z.string().min(1).optional(),
});

export const translateResponseSchema = z.object({
  text: z.string(),
  provider: z.string(),
  model: z.string(),
});

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type PublicConfigResponse = z.infer<typeof publicConfigResponseSchema>;
export type TranscribeResponse = z.infer<typeof transcribeResponseSchema>;
export type TranslateRequest = z.infer<typeof translateRequestSchema>;
export type TranslateResponse = z.infer<typeof translateResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
