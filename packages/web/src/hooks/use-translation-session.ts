import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPublicConfig, transcribeAudio, translateText } from '../api/client.js';
import { MediaRecorderCapture } from '../audio/media-recorder-capture.js';
import type { SpeechCapture } from '../audio/speech-capture.js';
import { WebSpeechCapture } from '../audio/web-speech-capture.js';
import { PermissionDeniedError, useSpeechCapture } from './use-speech-capture.js';
import { isLanguageCode } from '@app/shared';
import type {
  LanguageCode,
  PublicConfigResponse,
  TranscribeResponse,
  TranslateResponse,
} from '@app/shared';

const LANGUAGE_STORAGE_KEY = 'greenfield.targetLanguage';

export type SessionStatus =
  | 'idle'
  | 'requestingPermission'
  | 'recording'
  | 'transcribing'
  | 'translating'
  | 'done'
  | 'error';

export interface TranslationSession {
  status: SessionStatus;
  targetLanguage: LanguageCode;
  languages: PublicConfigResponse['languages'];
  providers: { transcription: string; translation: string };
  transcript: string;
  translation: string;
  transcriptMeta?: Pick<TranscribeResponse, 'provider' | 'model'>;
  translationMeta?: Pick<TranslateResponse, 'provider' | 'model'>;
  error?: string;
  recordingStartedAt?: number;
}

function createCaptureFor(provider: string): SpeechCapture {
  if (provider === 'web-speech') {
    return new WebSpeechCapture();
  }
  return new MediaRecorderCapture();
}

export function useTranslationSession() {
  const [config, setConfig] = useState<PublicConfigResponse | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [targetLanguage, setTargetLanguageState] = useState<LanguageCode>('es');
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [transcriptMeta, setTranscriptMeta] = useState<TranslationSession['transcriptMeta']>();
  const [translationMeta, setTranslationMeta] = useState<TranslationSession['translationMeta']>();
  const [error, setError] = useState<string | undefined>();
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | undefined>();

  const createCapture = useCallback(
    () => createCaptureFor(config?.providers.transcription ?? 'openai'),
    [config?.providers.transcription],
  );
  const capture = useSpeechCapture(createCapture);

  useEffect(() => {
    let cancelled = false;
    fetchPublicConfig()
      .then((loaded) => {
        if (cancelled) return;
        setConfig(loaded);
        const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        const initial =
          (stored && isLanguageCode(stored) && loaded.languages.some((language) => language.code === stored) && stored) ||
          (isLanguageCode(loaded.defaultLanguage) ? loaded.defaultLanguage : 'es');
        setTargetLanguageState(initial);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setConfigError(loadError instanceof Error ? loadError.message : 'Failed to load config');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTargetLanguage = useCallback((code: string) => {
    if (!isLanguageCode(code)) return;
    setTargetLanguageState(code);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  }, []);

  const dismissError = useCallback(() => {
    setError(undefined);
    setStatus((current) => (current === 'error' ? 'idle' : current));
  }, []);

  const fail = useCallback((message: string) => {
    setError(message);
    setStatus('error');
    setRecordingStartedAt(undefined);
  }, []);

  const toggleRecording = useCallback(async () => {
    if (status === 'recording') {
      try {
        const result = await capture.stop();
        setRecordingStartedAt(undefined);

        let english = result.text?.trim() ?? '';
        if (result.audio) {
          setStatus('transcribing');
          const transcribed = await transcribeAudio(result.audio);
          english = transcribed.text;
          setTranscript(english);
          setTranscriptMeta({ provider: transcribed.provider, model: transcribed.model });
        } else {
          setTranscript(english);
          setTranscriptMeta({
            provider: config?.providers.transcription ?? 'web-speech',
            model: 'web-speech',
          });
        }

        if (!english) {
          fail('No speech was captured. Try recording again.');
          return;
        }

        setStatus('translating');
        const translated = await translateText({
          text: english,
          targetLanguage,
          sourceLanguage: 'en',
        });
        setTranslation(translated.text);
        setTranslationMeta({ provider: translated.provider, model: translated.model });
        setStatus('done');
      } catch (stopError) {
        fail(stopError instanceof Error ? stopError.message : 'Failed to process recording');
      }
      return;
    }

    if (status === 'transcribing' || status === 'translating' || status === 'requestingPermission') {
      return;
    }

    try {
      setError(undefined);
      setStatus('requestingPermission');
      await capture.start();
      setRecordingStartedAt(Date.now());
      setStatus('recording');
    } catch (startError) {
      const message =
        startError instanceof PermissionDeniedError
          ? startError.message
          : startError instanceof Error
            ? startError.message
            : 'Could not start recording';
      fail(message);
    }
  }, [capture, config?.providers.transcription, fail, status, targetLanguage]);

  const session: TranslationSession = useMemo(
    () => ({
      status,
      targetLanguage,
      languages: config?.languages ?? [],
      providers: config?.providers ?? { transcription: '…', translation: '…' },
      transcript,
      translation,
      transcriptMeta,
      translationMeta,
      error: error ?? configError ?? undefined,
      recordingStartedAt,
    }),
    [
      config,
      configError,
      error,
      recordingStartedAt,
      status,
      targetLanguage,
      transcript,
      transcriptMeta,
      translation,
      translationMeta,
    ],
  );

  return {
    session,
    setTargetLanguage,
    toggleRecording,
    dismissError,
    ready: Boolean(config),
  };
}
