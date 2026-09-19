import { ErrorBanner } from './components/ErrorBanner.js';
import { LanguageSelect } from './components/LanguageSelect.js';
import { RecordButton } from './components/RecordButton.js';
import { TextPanel } from './components/TextPanel.js';
import { useTranslationSession } from './hooks/use-translation-session.js';

export function App() {
  const { session, setTargetLanguage, toggleRecording, dismissError, ready } = useTranslationSession();

  const transcriptPlaceholder =
    session.status === 'recording'
      ? 'Listening…'
      : session.status === 'transcribing'
        ? 'Transcribing…'
        : 'Your English transcript will land here.';

  const translationPlaceholder =
    session.status === 'translating'
      ? 'Translating…'
      : 'The translation will appear after the transcript.';

  return (
    <div className="shell">
      <header className="masthead">
        <p className="eyebrow">Local booth</p>
        <h1>Speak, then read it twice.</h1>
        <p className="lede">
          Record a thought in English. Watch the transcript land, then the translation into the language you pick.
        </p>
        <p className="providers">
          STT <strong>{session.providers.transcription}</strong>
          <span aria-hidden="true"> · </span>
          MT <strong>{session.providers.translation}</strong>
        </p>
      </header>

      {session.error ? <ErrorBanner message={session.error} onDismiss={dismissError} /> : null}

      <div className="controls">
        <LanguageSelect
          languages={session.languages}
          value={session.targetLanguage}
          onChange={setTargetLanguage}
          disabled={!ready}
        />
        <RecordButton
          status={session.status}
          startedAt={session.recordingStartedAt}
          disabled={!ready}
          onClick={() => {
            void toggleRecording();
          }}
        />
      </div>

      <div className="panels">
        <TextPanel
          title="English"
          text={session.transcript}
          placeholder={transcriptPlaceholder}
          loading={session.status === 'recording' || session.status === 'transcribing'}
          meta={
            session.transcriptMeta
              ? `${session.transcriptMeta.provider} · ${session.transcriptMeta.model}`
              : undefined
          }
        />
        <TextPanel
          title="Translation"
          text={session.translation}
          placeholder={translationPlaceholder}
          loading={session.status === 'translating'}
          meta={
            session.translationMeta
              ? `${session.translationMeta.provider} · ${session.translationMeta.model}`
              : undefined
          }
        />
      </div>
    </div>
  );
}
