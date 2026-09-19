import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { SpeechTranslationPipeline } from '@app/core';
import type { TranscriptionProvider } from '@app/core';
import type { TranslationProvider } from '@app/core';
import { createApp } from '../src/create-app.js';

function buildApp(overrides?: {
  transcribe?: TranscriptionProvider['transcribe'];
  translate?: TranslationProvider['translate'];
  serveStatic?: boolean;
  staticRoot?: string;
}) {
  const transcriber: TranscriptionProvider = {
    name: 'fake-stt',
    transcribe:
      overrides?.transcribe ??
      (async () => ({
        text: 'hello from audio',
        provider: 'fake-stt',
        model: 'fake',
      })),
  };
  const translator: TranslationProvider = {
    name: 'fake-mt',
    translate:
      overrides?.translate ??
      (async (req) => ({
        text: `translated:${req.targetLanguage}:${req.text}`,
        provider: 'fake-mt',
        model: 'fake',
      })),
  };

  return createApp({
    pipeline: new SpeechTranslationPipeline(transcriber, translator),
    publicConfig: {
      languages: [{ code: 'es', label: 'Spanish', nativeLabel: 'Español' }],
      defaultLanguage: 'es',
      providers: { transcription: 'openai', translation: 'gemini' },
    },
    maxUploadBytes: 1024,
    corsOrigins: ['http://localhost:5173'],
    serveStatic: overrides?.serveStatic,
    staticRoot: overrides?.staticRoot,
  });
}

describe('HTTP routes', () => {
  it('GET /api/health', async () => {
    const response = await request(buildApp()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /api/config', async () => {
    const response = await request(buildApp()).get('/api/config');
    expect(response.status).toBe(200);
    expect(response.body.providers.transcription).toBe('openai');
    expect(response.body.defaultLanguage).toBe('es');
  });

  it('POST /api/transcribe with audio', async () => {
    const response = await request(buildApp())
      .post('/api/transcribe')
      .attach('audio', Buffer.from('abc'), { filename: 'clip.webm', contentType: 'audio/webm' });
    expect(response.status).toBe(200);
    expect(response.body.text).toBe('hello from audio');
    expect(response.body.provider).toBe('fake-stt');
  });

  it('POST /api/transcribe without audio returns MISSING_AUDIO', async () => {
    const response = await request(buildApp()).post('/api/transcribe');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MISSING_AUDIO');
  });

  it('POST /api/translate', async () => {
    const response = await request(buildApp())
      .post('/api/translate')
      .send({ text: 'hello', targetLanguage: 'es' });
    expect(response.status).toBe(200);
    expect(response.body.text).toBe('translated:es:hello');
  });

  it('POST /api/translate rejects unknown languages', async () => {
    const response = await request(buildApp())
      .post('/api/translate')
      .send({ text: 'hello', targetLanguage: 'xx' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_REQUEST');
  });

  it('POST /api/translate rejects malformed JSON without exposing parser details', async () => {
    const response = await request(buildApp())
      .post('/api/translate')
      .set('Content-Type', 'application/json')
      .send('{"text":');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Malformed JSON request body',
      },
    });
  });

  it('returns a JSON 404 for unknown API routes when static serving is enabled', async () => {
    const response = await request(
      buildApp({ serveStatic: true, staticRoot: '/tmp/nonexistent-web-dist' }),
    ).get('/api/unknown');
    expect(response.status).toBe(404);
    expect(response.type).toBe('application/json');
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'API route not found',
      },
    });
  });

  it('maps provider failures without leaking secrets', async () => {
    const transcribe = vi.fn(async () => {
      throw new Error('vendor said sk-secret is bad');
    });
    const response = await request(buildApp({ transcribe }))
      .post('/api/transcribe')
      .attach('audio', Buffer.from('abc'), { filename: 'clip.webm', contentType: 'audio/webm' });
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('sk-secret');
    expect(response.body.error.message).toContain('[redacted]');
  });
});
