import { describe, expect, it } from 'vitest';
import { AppError, ErrorCode } from '@app/shared';
import { loadConfig } from '../src/config/load-config.js';

const validConfig = {
  server: {
    host: '127.0.0.1',
    port: 8787,
    corsOrigins: ['http://localhost:5173'],
    serveStatic: false,
  },
  apiKeys: {
    openai: 'sk-file',
    gemini: '',
  },
  providers: {
    transcription: {
      active: 'openai',
      openai: { model: 'gpt-4o-transcribe' },
      gemini: { model: 'gemini-2.5-flash' },
    },
    translation: {
      active: 'openai',
      gemini: { model: 'gemini-2.5-flash' },
      openai: { model: 'gpt-4o-mini' },
    },
  },
  audio: { maxUploadBytes: 1000 },
  languages: { default: 'es' },
};

describe('loadConfig', () => {
  it('loads a valid config file', () => {
    const config = loadConfig({
      env: {},
      readFile: () => JSON.stringify(validConfig),
    });
    expect(config.providers.transcription.active).toBe('openai');
    expect(config.apiKeys.openai).toBe('sk-file');
  });

  it('fails when the active provider key is missing', () => {
    const missingKey = structuredClone(validConfig);
    missingKey.apiKeys.openai = '';
    expect(() =>
      loadConfig({
        env: {},
        readFile: () => JSON.stringify(missingKey),
      }),
    ).toThrow(/apiKeys.openai is required/);
  });

  it('lets environment variables override file values', () => {
    const config = loadConfig({
      env: {
        OPENAI_API_KEY: 'sk-env',
        GEMINI_API_KEY: 'gm-env',
        PORT: '9999',
        HOST: '0.0.0.0',
        CORS_ORIGINS: 'https://example.com,https://app.example.com',
      },
      readFile: () => JSON.stringify(validConfig),
    });

    expect(config.apiKeys.openai).toBe('sk-env');
    expect(config.apiKeys.gemini).toBe('gm-env');
    expect(config.server.port).toBe(9999);
    expect(config.server.host).toBe('0.0.0.0');
    expect(config.server.corsOrigins).toEqual(['https://example.com', 'https://app.example.com']);
  });

  it('reports the specific field path for invalid JSON shape', () => {
    try {
      loadConfig({
        env: {},
        readFile: () => JSON.stringify({ ...validConfig, server: { ...validConfig.server, port: 'nope' } }),
      });
      throw new Error('expected loadConfig to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe(ErrorCode.CONFIG_ERROR);
      expect((error as AppError).message).toMatch(/server.port/);
    }
  });
});
