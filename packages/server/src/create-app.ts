import express, { type Express } from 'express';
import cors from 'cors';
import type { SpeechTranslationPipeline } from '@app/core';
import { ErrorCode, type PublicConfigResponse } from '@app/shared';
import path from 'node:path';
import { errorHandler } from './middleware/error-handler.js';
import { createUploader } from './middleware/upload.js';
import { createConfigRouter } from './routes/config.js';
import { healthRouter } from './routes/health.js';
import { createTranscribeRouter } from './routes/transcribe.js';
import { createTranslateRouter } from './routes/translate.js';

export interface AppDeps {
  pipeline: SpeechTranslationPipeline;
  publicConfig: PublicConfigResponse;
  maxUploadBytes: number;
  corsOrigins: string[];
  serveStatic?: boolean;
  staticRoot?: string;
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.use(cors({ origin: deps.corsOrigins }));
  app.use(express.json({ limit: '1mb' }));

  const upload = createUploader(deps.maxUploadBytes);
  app.use('/api', healthRouter);
  app.use('/api', createConfigRouter(deps.publicConfig));
  app.use('/api', createTranscribeRouter(deps.pipeline, upload));
  app.use('/api', createTranslateRouter(deps.pipeline));
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: {
        code: ErrorCode.NOT_FOUND,
        message: 'API route not found',
      },
    });
  });

  if (deps.serveStatic && deps.staticRoot) {
    app.use(express.static(deps.staticRoot));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(deps.staticRoot as string, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
