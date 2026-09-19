import { AppError, ErrorCode } from '@app/shared';
import type { TranslationProvider, TranslationRequest, TranslationResult } from '../../ports/translation-provider.js';
import { missingTextError, parseJsonResponse } from '../http.js';
import type { ProviderModelConfig } from '../types.js';

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

function translationPrompt(req: TranslationRequest): string {
  return [
    `Translate the following text from ${req.sourceLanguage} to ${req.targetLanguage}.`,
    'Return only the translation, with no quotes or extra commentary.',
    '',
    req.text,
  ].join('\n');
}

export class GeminiTranslationProvider implements TranslationProvider {
  readonly name = 'gemini';

  constructor(private readonly cfg: ProviderModelConfig) {}

  async translate(req: TranslationRequest): Promise<TranslationResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.cfg.model)}:generateContent`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.cfg.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: translationPrompt(req) }] }],
        }),
      });
    } catch (error) {
      throw new AppError(
        ErrorCode.PROVIDER_ERROR,
        `gemini translation network error: ${error instanceof Error ? error.message : 'unknown'}`,
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
