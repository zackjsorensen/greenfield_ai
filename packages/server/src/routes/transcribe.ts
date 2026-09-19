import { Router } from 'express';
import type { SpeechTranslationPipeline } from '@app/core';
import { AppError, ErrorCode } from '@app/shared';
import type { createUploader } from '../middleware/upload.js';

export function createTranscribeRouter(
  pipeline: SpeechTranslationPipeline,
  upload: ReturnType<typeof createUploader>,
): Router {
  const router = Router();

  router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
    try {
      const textField = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      const file = req.file;

      if (!file && !textField) {
        throw new AppError(ErrorCode.MISSING_AUDIO, 'Missing audio upload (field "audio")', 400);
      }

      const result = await pipeline.transcribe(
        file
          ? {
              data: file.buffer,
              mimeType: file.mimetype || 'application/octet-stream',
              filename: file.originalname || 'audio.webm',
            }
          : {
              data: Buffer.from(textField, 'utf8'),
              mimeType: 'text/plain',
              filename: 'transcript.txt',
            },
      );

      res.json({
        text: result.text,
        detectedLanguage: result.detectedLanguage,
        provider: result.provider,
        model: result.model,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
