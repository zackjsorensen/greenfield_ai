import type { AudioInput, TranscriptionProvider, TranscriptionResult } from '../../ports/transcription-provider.js';

export class PassthroughTranscriptionProvider implements TranscriptionProvider {
  readonly name = 'passthrough';

  async transcribe(input: AudioInput): Promise<TranscriptionResult> {
    return {
      text: input.data.toString('utf8'),
      provider: this.name,
      model: 'passthrough',
    };
  }
}
