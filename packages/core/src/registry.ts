import { AppError, ErrorCode } from '@app/shared';
import type { TranscriptionProvider } from './ports/transcription-provider.js';
import type { TranslationProvider } from './ports/translation-provider.js';
import { GeminiTranscriptionProvider } from './providers/transcription/gemini-transcription.js';
import { OpenAiTranscriptionProvider } from './providers/transcription/openai-transcription.js';
import { PassthroughTranscriptionProvider } from './providers/transcription/passthrough-transcription.js';
import { GeminiTranslationProvider } from './providers/translation/gemini-translation.js';
import { OpenAiTranslationProvider } from './providers/translation/openai-translation.js';
import type { ProviderModelConfig } from './providers/types.js';

export interface ProviderConfig {
  apiKey?: string;
  model?: string;
}

type TranscriptionFactory = (cfg: ProviderConfig) => TranscriptionProvider;
type TranslationFactory = (cfg: ProviderConfig) => TranslationProvider;

const transcriptionFactories = {
  openai: (cfg) => new OpenAiTranscriptionProvider(requireModelConfig('openai', cfg, 'gpt-4o-transcribe')),
  gemini: (cfg) => new GeminiTranscriptionProvider(requireModelConfig('gemini', cfg, 'gemini-2.5-flash')),
  passthrough: () => new PassthroughTranscriptionProvider(),
  'web-speech': () => new PassthroughTranscriptionProvider(),
} satisfies Record<string, TranscriptionFactory>;

const translationFactories = {
  gemini: (cfg) => new GeminiTranslationProvider(requireModelConfig('gemini', cfg, 'gemini-2.5-flash')),
  openai: (cfg) => new OpenAiTranslationProvider(requireModelConfig('openai', cfg, 'gpt-4o-mini')),
} satisfies Record<string, TranslationFactory>;

export const TRANSCRIPTION_PROVIDERS = Object.keys(transcriptionFactories);
export const TRANSLATION_PROVIDERS = Object.keys(translationFactories);

function requireModelConfig(name: string, cfg: ProviderConfig, fallbackModel: string): ProviderModelConfig {
  if (!cfg.apiKey) {
    throw new AppError(
      ErrorCode.CONFIG_ERROR,
      `API key missing for provider "${name}"`,
      500,
    );
  }
  return {
    apiKey: cfg.apiKey,
    model: cfg.model ?? fallbackModel,
  };
}

function unknownProvider(kind: string, name: string, valid: string[]): never {
  throw new AppError(
    ErrorCode.CONFIG_ERROR,
    `Unknown ${kind} provider "${name}". Valid options: ${valid.join(', ')}`,
    500,
  );
}

export function createTranscriptionProvider(name: string, cfg: ProviderConfig): TranscriptionProvider {
  const factory = transcriptionFactories[name as keyof typeof transcriptionFactories];
  if (!factory) {
    unknownProvider('transcription', name, TRANSCRIPTION_PROVIDERS);
  }
  return factory(cfg);
}

export function createTranslationProvider(name: string, cfg: ProviderConfig): TranslationProvider {
  const factory = translationFactories[name as keyof typeof translationFactories];
  if (!factory) {
    unknownProvider('translation', name, TRANSLATION_PROVIDERS);
  }
  return factory(cfg);
}
