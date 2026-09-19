import { AppError, ErrorCode } from '@app/shared';
import type { AudioInput, TranscriptionProvider, TranscriptionResult } from '../../ports/transcription-provider.js';
import { missingTextError, parseJsonResponse } from '../http.js';
import type { ProviderModelConfig } from '../types.js';

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export class GeminiTranscriptionProvider implements TranscriptionProvider {
  readonly name = 'gemini';

  constructor(private readonly cfg: ProviderModelConfig) {}

  async transcribe(input: AudioInput): Promise<TranscriptionResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.cfg.model)}:generateContent`;
    const body = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: input.mimeType || 'audio/webm',
                data: input.data.toString('base64'),
              },
            },
            {
              text: 'Transcribe this audio. Return only the spoken words, with no extra commentary.',
            },
          ],
        },
      ],
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.cfg.apiKey,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new AppError(
        ErrorCode.PROVIDER_ERROR,
        `gemini transcription network error: ${error instanceof Error ? error.message : 'unknown'}`,
        502,
      );
    }

    const json = await parseJsonResponse<GeminiGenerateContentResponse>(response, 'gemini');
    const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
    if (!text) {
      throw missingTextError('gemini');
    }

    return {
      text,
      provider: this.name,
      model: this.cfg.model,
    };
  }
}
