import type { SpeechCapture } from './speech-capture.js';

function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export class MediaRecorderCapture implements SpeechCapture {
  readonly mode = 'audio-upload' as const;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private mimeType = '';

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.mimeType = pickMimeType() ?? '';
    this.recorder = this.mimeType
      ? new MediaRecorder(this.stream, { mimeType: this.mimeType })
      : new MediaRecorder(this.stream);
    this.mimeType = this.recorder.mimeType;
    this.recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });
    this.recorder.start(100);
  }

  async stop(): Promise<{ audio?: Blob; text?: string }> {
    const recorder = this.recorder;
    const stream = this.stream;
    if (!recorder) {
      throw new Error('Not recording');
    }

    const audio = await new Promise<Blob>((resolve, reject) => {
      recorder.addEventListener(
        'stop',
        () => {
          resolve(new Blob(this.chunks, { type: this.mimeType || 'audio/webm' }));
        },
        { once: true },
      );
      recorder.addEventListener(
        'error',
        () => {
          reject(new Error('Recording failed'));
        },
        { once: true },
      );
      recorder.stop();
    });

    stream?.getTracks().forEach((track) => track.stop());
    this.recorder = null;
    this.stream = null;
    return { audio };
  }
}
