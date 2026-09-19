import { AppError, ErrorCode } from '@app/shared';
import type { TranslationProvider, TranslationRequest, TranslationResult } from '../../ports/translation-provider.js';
import { missingTextError, parseJsonResponse } from '../http.js';
import type { ProviderModelConfig } from '../types.js';

interface OpenAiChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class OpenAiTranslationProvider implements TranslationProvider {
  readonly name = 'openai';

  constructor(private readonly cfg: ProviderModelConfig) {}

  async translate(req: TranslationRequest): Promise<TranslationResult> {
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.cfg.model,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content:
                'You are a translation engine. Return only the translated text, with no quotes or extra commentary.',
            },
            {
              role: 'user',
              content: `Translate from ${req.sourceLanguage} to ${req.targetLanguage}:\n\n${req.text}`,
            },
          ],
        }),
      });
    } catch (error) {
      throw new AppError(
        ErrorCode.PROVIDER_ERROR,
        `openai translation network error: ${error instanceof Error ? error.message : 'unknown'}`,
        502,
      );
    }

    const json = await parseJsonResponse<OpenAiChatResponse>(response, 'openai');
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw missingTextError('openai');
    }

    return {
      text,
      provider: this.name,
      model: this.cfg.model,
    };
  }
}
