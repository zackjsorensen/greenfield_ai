export interface AudioInput {
  data: Buffer;
  mimeType: string;
  filename: string;
}

export interface TranscriptionResult {
  text: string;
  detectedLanguage?: string;
  provider: string;
  model: string;
}

export interface TranscriptionProvider {
  readonly name: string;
  transcribe(input: AudioInput, opts?: { sourceLanguage?: string }): Promise<TranscriptionResult>;
}
