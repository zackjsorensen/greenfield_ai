import type {
  ErrorResponse,
  PublicConfigResponse,
  TranscribeResponse,
  TranslateRequest,
  TranslateResponse,
} from '@app/shared';

function apiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return (base && base.length > 0 ? base : '/api').replace(/\/$/, '');
}

function apiUrl(path: string): string {
  return `${apiBase()}/${path.replace(/^\//, '')}`;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ErrorResponse;
    return body.error?.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function fetchPublicConfig(): Promise<PublicConfigResponse> {
  const response = await fetch(apiUrl('config'));
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return response.json() as Promise<PublicConfigResponse>;
}

export async function transcribeAudio(audio: Blob): Promise<TranscribeResponse> {
  const form = new FormData();
  const filename = audio.type.includes('mp4') ? 'clip.mp4' : 'clip.webm';
  form.append('audio', audio, filename);
  const response = await fetch(apiUrl('transcribe'), {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return response.json() as Promise<TranscribeResponse>;
}

export async function translateText(request: TranslateRequest): Promise<TranslateResponse> {
  const response = await fetch(apiUrl('translate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return response.json() as Promise<TranslateResponse>;
}
