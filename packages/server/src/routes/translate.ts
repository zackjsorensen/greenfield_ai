import { Router } from 'express';
import type { SpeechTranslationPipeline } from '@app/core';
import { AppError, ErrorCode, translateRequestSchema } from '@app/shared';

export function createTranslateRouter(pipeline: SpeechTranslationPipeline): Router {
  const router = Router();

  router.post('/translate', async (req, res, next) => {
    try {
      const parsed = translateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          parsed.error.issues.map((issue) => issue.message).join('; ') || 'Invalid translate request',
          400,
        );
      }

      const result = await pipeline.translate({
        text: parsed.data.text,
        sourceLanguage: parsed.data.sourceLanguage ?? 'en',
        targetLanguage: parsed.data.targetLanguage,
      });

      res.json({
        text: result.text,
        provider: result.provider,
        model: result.model,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
