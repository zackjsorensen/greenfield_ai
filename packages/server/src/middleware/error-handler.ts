import type { ErrorRequestHandler } from 'express';
import { AppError, ErrorCode, errorStatusByCode } from '@app/shared';

function scrub(value: string): string {
  return value.replace(/(sk-[A-Za-z0-9_-]+)|(AIza[A-Za-z0-9_-]+)/g, '[redacted]');
}

function isMalformedJsonError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  );
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status || errorStatusByCode[err.code]).json({
      error: {
        code: err.code,
        message: scrub(err.message),
      },
    });
    return;
  }

  if (isMalformedJsonError(err)) {
    res.status(400).json({
      error: {
        code: ErrorCode.INVALID_REQUEST,
        message: 'Malformed JSON request body',
      },
    });
    return;
  }

  if (err && typeof err === 'object' && 'code' in err && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: {
        code: ErrorCode.AUDIO_TOO_LARGE,
        message: 'Audio upload exceeds the configured size limit',
      },
    });
    return;
  }

  const message = err instanceof Error ? scrub(err.message) : 'Unexpected error';
  res.status(500).json({
    error: {
      code: ErrorCode.CONFIG_ERROR,
      message,
    },
  });
};
