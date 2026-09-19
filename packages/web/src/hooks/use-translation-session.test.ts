import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTranslationSession } from './use-translation-session.js';

const mocks = vi.hoisted(() => ({
  fetchPublicConfig: vi.fn(),
  transcribeAudio: vi.fn(),
  translateText: vi.fn(),
  startCapture: vi.fn(),
  stopCapture: vi.fn(),
}));

vi.mock('../api/client.js', () => ({
  fetchPublicConfig: mocks.fetchPublicConfig,
  transcribeAudio: mocks.transcribeAudio,
  translateText: mocks.translateText,
}));

vi.mock('./use-speech-capture.js', () => ({
  PermissionDeniedError: class PermissionDeniedError extends Error {},
  useSpeechCapture: () => ({
    start: mocks.startCapture,
    stop: mocks.stopCapture,
    active: false,
  }),
}));

describe('useTranslationSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.fetchPublicConfig.mockResolvedValue({
      languages: [{ code: 'es', label: 'Spanish', nativeLabel: 'Español' }],
      defaultLanguage: 'es',
      providers: { transcription: 'openai', translation: 'gemini' },
    });
    mocks.startCapture.mockResolvedValue(undefined);
    mocks.stopCapture.mockResolvedValue({
      audio: new Blob(['audio'], { type: 'audio/webm' }),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('clears an old translation when a new transcript is accepted and translation fails', async () => {
    mocks.transcribeAudio
      .mockResolvedValueOnce({
        text: 'first transcript',
        provider: 'openai',
        model: 'test-stt',
      })
      .mockResolvedValueOnce({
        text: 'second transcript',
        provider: 'openai',
        model: 'test-stt',
      });
    mocks.translateText
      .mockResolvedValueOnce({
        text: 'first translation',
        provider: 'gemini',
        model: 'test-mt',
      })
      .mockRejectedValueOnce(new Error('Translation unavailable'));

    const { result } = renderHook(() => useTranslationSession());
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.toggleRecording();
    });
    await act(async () => {
      await result.current.toggleRecording();
    });
    expect(result.current.session.translation).toBe('first translation');

    await act(async () => {
      await result.current.toggleRecording();
    });
    await act(async () => {
      await result.current.toggleRecording();
    });

    expect(result.current.session.status).toBe('error');
    expect(result.current.session.transcript).toBe('second transcript');
    expect(result.current.session.translation).toBe('');
    expect(result.current.session.translationMeta).toBeUndefined();
  });
});
