import { AppError, ErrorCode } from '@app/shared';

function snippet(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, 180);
}

export async function parseJsonResponse<T>(response: Response, provider: string): Promise<T> {
  const body = await response.text();
  if (!response.ok) {
    const detail = snippet(body);
    const suffix = detail ? `: ${detail}` : '';
    throw new AppError(
      ErrorCode.PROVIDER_ERROR,
      `${provider} request failed (${response.status})${suffix}`,
      502,
    );
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new AppError(ErrorCode.PROVIDER_ERROR, `${provider} returned invalid JSON`, 502);
  }
}

export function missingTextError(provider: string): AppError {
  return new AppError(ErrorCode.PROVIDER_ERROR, `${provider} returned no text`, 502);
}
