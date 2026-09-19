import type { AudioInput, TranscriptionProvider } from './ports/transcription-provider.js';
import type { TranslationProvider, TranslationRequest } from './ports/translation-provider.js';

export class SpeechTranslationPipeline {
  constructor(
    private readonly transcriber: TranscriptionProvider,
    private readonly translator: TranslationProvider,
  ) {}

  transcribe(audio: AudioInput) {
    return this.transcriber.transcribe(audio);
  }

  translate(req: TranslationRequest) {
    return this.translator.translate(req);
  }
}
