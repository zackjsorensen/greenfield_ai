import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TRANSCRIPTION_PROVIDERS, TRANSLATION_PROVIDERS } from '@app/core';
import { AppError, ErrorCode, isLanguageCode } from '@app/shared';
import { appConfigSchema, type AppConfig } from './schema.js';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

export interface LoadConfigOptions {
  env?: NodeJS.ProcessEnv;
  readFile?: (path: string) => string;
}

const KEY_REQUIRED_TRANSCRIPTION = new Set(['openai', 'gemini']);
const KEY_REQUIRED_TRANSLATION = new Set(['openai', 'gemini']);

function parsePort(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(ErrorCode.CONFIG_ERROR, `Invalid PORT: ${value}`, 500);
  }
  return parsed;
}

function applyEnvOverrides(config: AppConfig, env: NodeJS.ProcessEnv): AppConfig {
  const corsOrigins = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : config.server.corsOrigins;

  return {
    ...config,
    server: {
      ...config.server,
      host: env.HOST || config.server.host,
      port: parsePort(env.PORT) ?? config.server.port,
      corsOrigins: corsOrigins.length > 0 ? corsOrigins : config.server.corsOrigins,
    },
    apiKeys: {
      openai: env.OPENAI_API_KEY || config.apiKeys.openai,
      gemini: env.GEMINI_API_KEY || config.apiKeys.gemini,
    },
  };
}

function formatZodError(error: { issues: Array<{ path: (string | number)[]; message: string }> }): string {
  return error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
}

function requireActiveKey(config: AppConfig): void {
  const transcription = config.providers.transcription.active;
  if (KEY_REQUIRED_TRANSCRIPTION.has(transcription)) {
    const key = transcription === 'openai' ? config.apiKeys.openai : config.apiKeys.gemini;
    if (!key) {
      throw new AppError(
        ErrorCode.CONFIG_ERROR,
        `apiKeys.${transcription} is required because providers.transcription.active is "${transcription}"`,
        500,
      );
    }
  }

  const translation = config.providers.translation.active;
  if (KEY_REQUIRED_TRANSLATION.has(translation)) {
    const key = translation === 'openai' ? config.apiKeys.openai : config.apiKeys.gemini;
    if (!key) {
      throw new AppError(
        ErrorCode.CONFIG_ERROR,
        `apiKeys.${translation} is required because providers.translation.active is "${translation}"`,
        500,
      );
    }
  }
}

export function loadConfig(options: LoadConfigOptions = {}): AppConfig {
  const env = options.env ?? process.env;
  const readFile = options.readFile ?? ((configPath: string) => readFileSync(configPath, 'utf8'));
  const configPath = env.CONFIG_PATH || fileURLToPath(new URL('../../../../config/config.json', import.meta.url));

  let raw: unknown;
  try {
    raw = JSON.parse(readFile(configPath));
  } catch (error) {
    throw new AppError(
      ErrorCode.CONFIG_ERROR,
      `Failed to read config at ${configPath}: ${error instanceof Error ? error.message : 'unknown error'}`,
      500,
    );
  }

  const parsed = appConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(ErrorCode.CONFIG_ERROR, `Invalid config: ${formatZodError(parsed.error)}`, 500);
  }

  const config = applyEnvOverrides(parsed.data, env);

  if (!isLanguageCode(config.languages.default)) {
    throw new AppError(
      ErrorCode.CONFIG_ERROR,
      `languages.default "${config.languages.default}" is not a supported language code`,
      500,
    );
  }

  if (!TRANSCRIPTION_PROVIDERS.includes(config.providers.transcription.active)) {
    throw new AppError(
      ErrorCode.CONFIG_ERROR,
      `Unknown transcription provider "${config.providers.transcription.active}". Valid options: ${TRANSCRIPTION_PROVIDERS.join(', ')}`,
      500,
    );
  }

  if (!TRANSLATION_PROVIDERS.includes(config.providers.translation.active)) {
    throw new AppError(
      ErrorCode.CONFIG_ERROR,
      `Unknown translation provider "${config.providers.translation.active}". Valid options: ${TRANSLATION_PROVIDERS.join(', ')}`,
      500,
    );
  }

  requireActiveKey(config);
  return config;
}

export function resolveStaticRoot(): string {
  return fileURLToPath(new URL('../../../../packages/web/dist', import.meta.url));
}

export { REPO_ROOT };
