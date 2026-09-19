import {
  createTranscriptionProvider,
  createTranslationProvider,
  SpeechTranslationPipeline,
} from '@app/core';
import { LANGUAGES } from '@app/shared';
import type { AppConfig } from './config/schema.js';
import { loadConfig, resolveStaticRoot } from './config/load-config.js';
import { createApp } from './create-app.js';

function keyFor(config: AppConfig, provider: string): string | undefined {
  if (provider === 'openai') return config.apiKeys.openai || undefined;
  if (provider === 'gemini') return config.apiKeys.gemini || undefined;
  return undefined;
}

function transcriptionModel(config: AppConfig): string | undefined {
  const name = config.providers.transcription.active;
  if (name === 'openai') return config.providers.transcription.openai?.model;
  if (name === 'gemini') return config.providers.transcription.gemini?.model;
  return undefined;
}

function translationModel(config: AppConfig): string | undefined {
  const name = config.providers.translation.active;
  if (name === 'openai') return config.providers.translation.openai?.model;
  if (name === 'gemini') return config.providers.translation.gemini?.model;
  return undefined;
}

function boot() {
  let config: AppConfig;
  try {
    config = loadConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }

  const transcriptionName = config.providers.transcription.active;
  const translationName = config.providers.translation.active;

  const pipeline = new SpeechTranslationPipeline(
    createTranscriptionProvider(transcriptionName, {
      apiKey: keyFor(config, transcriptionName),
      model: transcriptionModel(config),
    }),
    createTranslationProvider(translationName, {
      apiKey: keyFor(config, translationName),
      model: translationModel(config),
    }),
  );

  const app = createApp({
    pipeline,
    publicConfig: {
      languages: [...LANGUAGES],
      defaultLanguage: config.languages.default,
      providers: {
        transcription: transcriptionName,
        translation: translationName,
      },
    },
    maxUploadBytes: config.audio.maxUploadBytes,
    corsOrigins: config.server.corsOrigins,
    serveStatic: config.server.serveStatic,
    staticRoot: config.server.serveStatic ? resolveStaticRoot() : undefined,
  });

  app.listen(config.server.port, config.server.host, () => {
    console.log(`API listening on http://${config.server.host}:${config.server.port}`);
  });
}

boot();
