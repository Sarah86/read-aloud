import { useState } from "react";

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function PasteText({ onSubmit, disabled }: Props) {
  const [text, setText] = useState("");
  const trimmed = text.trim();

  const submit = () => {
    if (trimmed) onSubmit(text);
  };

  return (
    <div className="paste-text">
      <div className="paste-divider">
        <span>or paste text</span>
      </div>
      <textarea
        className="paste-input"
        placeholder="Paste an article, chapter, notes…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        disabled={disabled}
        rows={5}
      />
      {trimmed && (
        <div className="paste-footer">
          <span className="paste-count">{trimmed.length.toLocaleString()} chars</span>
          <button className="paste-submit" onClick={submit} disabled={disabled}>
            Read this
          </button>
        </div>
      )}

      <style>{`
        .paste-text {
          display: flex;
          flex-direction: column;
          gap: 10px;
          animation: fadeIn 400ms ease 100ms both;
        }
        .paste-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-muted);
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .paste-divider::before, .paste-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .paste-input {
          width: 100%;
          resize: vertical;
          min-height: 96px;
          padding: 12px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          color: var(--text-primary);
          font-family: var(--font-mono);
          font-size: 12px;
          line-height: 1.6;
          transition: border-color var(--transition);
        }
        .paste-input::placeholder {
          color: var(--text-muted);
        }
        .paste-input:focus {
          outline: none;
          border-color: var(--accent-dim);
        }
        .paste-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .paste-count {
          font-size: 10px;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }
        .paste-submit {
          background: var(--accent);
          color: #0f0f0f;
          border-radius: var(--radius);
          padding: 8px 16px;
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.04em;
          transition: all var(--transition);
        }
        .paste-submit:hover:not(:disabled) {
          background: #d9bc85;
        }
      `}</style>
    </div>
  );
}
