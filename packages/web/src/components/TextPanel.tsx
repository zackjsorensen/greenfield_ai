interface TextPanelProps {
  title: string;
  text: string;
  placeholder: string;
  loading?: boolean;
  meta?: string;
}

export function TextPanel({ title, text, placeholder, loading, meta }: TextPanelProps) {
  return (
    <section className="text-panel">
      <header>
        <h2>{title}</h2>
        {meta ? <span className="text-panel__meta">{meta}</span> : null}
      </header>
      <p className={text ? 'text-panel__body' : 'text-panel__body text-panel__body--empty'}>
        {loading ? placeholder : text || placeholder}
      </p>
    </section>
  );
}
