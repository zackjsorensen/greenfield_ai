import { AppError, ErrorCode } from '@app/shared';
import type { AudioInput, TranscriptionProvider, TranscriptionResult } from '../../ports/transcription-provider.js';
import { missingTextError, parseJsonResponse } from '../http.js';
import type { ProviderModelConfig } from '../types.js';

interface OpenAiTranscriptionJson {
  text?: string;
  language?: string;
}

export class OpenAiTranscriptionProvider implements TranscriptionProvider {
  readonly name = 'openai';

  constructor(private readonly cfg: ProviderModelConfig) {}

  async transcribe(
    input: AudioInput,
    opts?: { sourceLanguage?: string },
  ): Promise<TranscriptionResult> {
    const form = new FormData();
    form.append('model', this.cfg.model);
    form.append(
      'file',
      new Blob([new Uint8Array(input.data)], { type: input.mimeType || 'application/octet-stream' }),
      input.filename || 'audio.webm',
    );
    if (opts?.sourceLanguage) {
      form.append('language', opts.sourceLanguage);
    }

    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.cfg.apiKey}`,
        },
        body: form,
      });
    } catch (error) {
      throw new AppError(
        ErrorCode.PROVIDER_ERROR,
        `openai transcription network error: ${error instanceof Error ? error.message : 'unknown'}`,
        502,
      );
    }

    const json = await parseJsonResponse<OpenAiTranscriptionJson>(response, 'openai');
    if (!json.text) {
      throw missingTextError('openai');
    }

    return {
      text: json.text,
      detectedLanguage: json.language,
      provider: this.name,
      model: this.cfg.model,
    };
  }
}
