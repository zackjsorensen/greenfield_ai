import { describe, expect, it, vi } from 'vitest';
import { SpeechTranslationPipeline } from '../src/pipeline.js';
import type { TranscriptionProvider } from '../src/ports/transcription-provider.js';
import type { TranslationProvider } from '../src/ports/translation-provider.js';

describe('SpeechTranslationPipeline', () => {
  it('transcribes without calling translate', async () => {
    const transcriber: TranscriptionProvider = {
      name: 'fake-stt',
      transcribe: vi.fn(async () => ({
        text: 'hello',
        provider: 'fake-stt',
        model: 'm',
      })),
    };
    const translator: TranslationProvider = {
      name: 'fake-mt',
      translate: vi.fn(async () => ({
        text: 'hola',
        provider: 'fake-mt',
        model: 'm',
      })),
    };

    const pipeline = new SpeechTranslationPipeline(transcriber, translator);
    const result = await pipeline.transcribe({
      data: Buffer.from('audio'),
      mimeType: 'audio/webm',
      filename: 'clip.webm',
    });

    expect(result.text).toBe('hello');
    expect(translator.translate).not.toHaveBeenCalled();
  });

  it('translates independently of transcription', async () => {
    const transcriber: TranscriptionProvider = {
      name: 'fake-stt',
      transcribe: vi.fn(),
    };
    const translator: TranslationProvider = {
      name: 'fake-mt',
      translate: vi.fn(async (req) => ({
        text: `ES:${req.text}`,
        provider: 'fake-mt',
        model: 'm',
      })),
    };

    const pipeline = new SpeechTranslationPipeline(transcriber, translator);
    const result = await pipeline.translate({
      text: 'hello',
      sourceLanguage: 'en',
      targetLanguage: 'es',
    });

    expect(result.text).toBe('ES:hello');
    expect(transcriber.transcribe).not.toHaveBeenCalled();
  });
});
