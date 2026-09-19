import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError, ErrorCode } from '@app/shared';
import { OpenAiTranscriptionProvider } from '../src/providers/transcription/openai-transcription.js';
import { GeminiTranslationProvider } from '../src/providers/translation/gemini-translation.js';
import { OpenAiTranslationProvider } from '../src/providers/translation/openai-translation.js';
import { createTranscriptionProvider, createTranslationProvider } from '../src/registry.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('OpenAiTranscriptionProvider', () => {
  it('posts multipart audio with the configured model', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer sk-test' });
      const body = init?.body as FormData;
      expect(body.get('model')).toBe('gpt-4o-transcribe');
      expect(body.get('file')).toBeInstanceOf(Blob);
      return new Response(JSON.stringify({ text: 'hello there', language: 'en' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new OpenAiTranscriptionProvider({ apiKey: 'sk-test', model: 'gpt-4o-transcribe' });
    const result = await provider.transcribe({
      data: Buffer.from('audio-bytes'),
      mimeType: 'audio/webm',
      filename: 'clip.webm',
    });

    expect(result).toEqual({
      text: 'hello there',
      detectedLanguage: 'en',
      provider: 'openai',
      model: 'gpt-4o-transcribe',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('maps vendor errors to AppError without echoing the key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('invalid api key sk-secret', { status: 401 })),
    );

    const provider = new OpenAiTranscriptionProvider({ apiKey: 'sk-secret', model: 'gpt-4o-transcribe' });
    await expect(
      provider.transcribe({ data: Buffer.from('x'), mimeType: 'audio/webm', filename: 'a.webm' }),
    ).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.PROVIDER_ERROR,
    });
  });
});

describe('GeminiTranslationProvider', () => {
  it('sends the API key in a header rather than the URL', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).not.toContain('key=');
      expect(init?.headers).toMatchObject({ 'x-goog-api-key': 'gm-test' });
      const parsed = JSON.parse(String(init?.body));
      expect(parsed.contents[0].parts[0].text).toContain('hola mundo');
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'hello world' }] } }] }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new GeminiTranslationProvider({ apiKey: 'gm-test', model: 'gemini-2.5-flash' });
    const result = await provider.translate({
      text: 'hola mundo',
      sourceLanguage: 'es',
      targetLanguage: 'en',
    });

    expect(result.text).toBe('hello world');
  });
});

describe('OpenAiTranslationProvider', () => {
  it('maps empty choices to AppError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ choices: [] }), { status: 200 })),
    );
    const provider = new OpenAiTranslationProvider({ apiKey: 'sk-test', model: 'gpt-4o-mini' });
    await expect(
      provider.translate({ text: 'hi', sourceLanguage: 'en', targetLanguage: 'es' }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('registry', () => {
  it('lists valid options for unknown names', () => {
    expect(() => createTranscriptionProvider('nope', {})).toThrow(/openai, gemini, passthrough, web-speech/);
    expect(() => createTranslationProvider('nope', {})).toThrow(/gemini, openai/);
  });
});
