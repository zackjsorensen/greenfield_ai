export const ErrorCode = {
  MISSING_AUDIO: 'MISSING_AUDIO',
  AUDIO_TOO_LARGE: 'AUDIO_TOO_LARGE',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  CONFIG_ERROR: 'CONFIG_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const errorStatusByCode: Record<ErrorCode, number> = {
  MISSING_AUDIO: 400,
  AUDIO_TOO_LARGE: 413,
  PROVIDER_ERROR: 502,
  INVALID_REQUEST: 400,
  CONFIG_ERROR: 500,
};
