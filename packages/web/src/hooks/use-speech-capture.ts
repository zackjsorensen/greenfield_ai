import { useCallback, useRef, useState } from 'react';
import type { SpeechCapture } from '../audio/speech-capture.js';

export class PermissionDeniedError extends Error {
  constructor() {
    super('Microphone access was denied. Enable it in your browser settings for this site, then try again.');
    this.name = 'PermissionDeniedError';
  }
}

function isPermissionDenied(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
  );
}

export function useSpeechCapture(createCapture: () => SpeechCapture) {
  const captureRef = useRef<SpeechCapture | null>(null);
  const [active, setActive] = useState(false);

  const start = useCallback(async () => {
    const capture = createCapture();
    captureRef.current = capture;
    try {
      await capture.start();
      setActive(true);
    } catch (error) {
      captureRef.current = null;
      setActive(false);
      if (isPermissionDenied(error)) {
        throw new PermissionDeniedError();
      }
      throw error;
    }
  }, [createCapture]);

  const stop = useCallback(async () => {
    const capture = captureRef.current;
    if (!capture) {
      throw new Error('Not recording');
    }
    try {
      const result = await capture.stop();
      return result;
    } finally {
      captureRef.current = null;
      setActive(false);
    }
  }, []);

  return { start, stop, active };
}
