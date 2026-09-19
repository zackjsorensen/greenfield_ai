import type { SpeechCapture } from './speech-capture.js';

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export class WebSpeechCapture implements SpeechCapture {
  readonly mode = 'local-text' as const;
  private recognition: BrowserSpeechRecognition | null = null;
  private transcripts: string[] = [];
  private error: string | null = null;

  async start(): Promise<void> {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      throw new Error('This browser does not support the Web Speech API. Switch transcription to openai or gemini in config.');
    }

    await navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });

    this.transcripts = [];
    this.error = null;
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result) {
          combined += result[0].transcript;
        }
      }
      this.transcripts = [combined.trim()];
    };
    recognition.onerror = (event) => {
      this.error = event.error;
    };
    recognition.start();
    this.recognition = recognition;
  }

  async stop(): Promise<{ audio?: Blob; text?: string }> {
    const recognition = this.recognition;
    if (!recognition) {
      throw new Error('Not recording');
    }

    const text = await new Promise<string>((resolve, reject) => {
      recognition.onend = () => {
        if (this.error === 'not-allowed') {
          reject(new Error('Microphone access was denied. Enable it in your browser settings for this site, then try again.'));
          return;
        }
        resolve(this.transcripts.join(' ').trim());
      };
      recognition.stop();
    });

    this.recognition = null;
    return { text };
  }
}

export function isWebSpeechAvailable(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}
