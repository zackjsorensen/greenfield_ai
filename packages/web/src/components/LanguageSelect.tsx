import type { PublicConfigResponse } from '@app/shared';

interface LanguageSelectProps {
  languages: PublicConfigResponse['languages'];
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function LanguageSelect({ languages, value, onChange, disabled }: LanguageSelectProps) {
  return (
    <label className="language-select">
      <span>Translate to</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label} — {language.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
