import { useEffect, useState } from 'react';
import type { SessionStatus } from '../hooks/use-translation-session.js';

interface RecordButtonProps {
  status: SessionStatus;
  startedAt?: number;
  disabled?: boolean;
  onClick: () => void;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function RecordButton({ status, startedAt, disabled, onClick }: RecordButtonProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status !== 'recording' || !startedAt) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [status, startedAt]);

  const recording = status === 'recording';
  const processing = status === 'requestingPermission' || status === 'transcribing' || status === 'translating';

  let label = 'Start recording';
  if (status === 'requestingPermission') label = 'Allow microphone…';
  if (recording) label = 'Stop recording';
  if (status === 'transcribing') label = 'Transcribing…';
  if (status === 'translating') label = 'Translating…';

  return (
    <div className="record-wrap">
      <button
        type="button"
        className={`record-button${recording ? ' record-button--live' : ''}`}
        onClick={onClick}
        disabled={disabled || processing}
        aria-pressed={recording}
      >
        <span className="record-button__glyph" />
        {label}
      </button>
      {recording && startedAt ? (
        <p className="record-timer" aria-live="polite">
          {formatElapsed(now - startedAt)}
        </p>
      ) : (
        <p className="record-timer record-timer--idle">Click once to talk, click again to stop</p>
      )}
    </div>
  );
}
