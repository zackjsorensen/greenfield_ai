export interface SpeechCapture {
  readonly mode: 'audio-upload' | 'local-text';
  start(): Promise<void>;
  stop(): Promise<{ audio?: Blob; text?: string }>;
}
