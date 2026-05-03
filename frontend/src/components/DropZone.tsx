import { useRef, useState, DragEvent, ChangeEvent } from "react";

interface Props {
  onFile: (file: File) => void;
  loading: boolean;
}

export function DropZone({ onFile, loading }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") onFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      className={`dropzone ${dragging ? "dragging" : ""} ${loading ? "loading" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleChange}
        style={{ display: "none" }}
      />

      {loading ? (
        <div className="dropzone-inner">
          <div className="spinner" />
          <span className="dropzone-label">Extracting text...</span>
        </div>
      ) : (
        <div className="dropzone-inner">
          <div className="dropzone-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <span className="dropzone-label">Drop a PDF here</span>
          <span className="dropzone-sub">or tap to choose</span>
        </div>
      )}

      <style>{`
        .dropzone {
          border: 1.5px dashed var(--border-light);
          border-radius: var(--radius-lg);
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: all var(--transition);
          background: var(--bg-card);
          animation: fadeIn 400ms ease both;
        }
        .dropzone:hover, .dropzone.dragging {
          border-color: var(--accent-dim);
          background: var(--accent-glow);
        }
        .dropzone.loading {
          cursor: default;
          pointer-events: none;
        }
        .dropzone-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .dropzone-icon {
          color: var(--accent-dim);
          margin-bottom: 4px;
        }
        .dropzone-label {
          color: var(--text-secondary);
          font-size: 13px;
          letter-spacing: 0.05em;
        }
        .dropzone-sub {
          color: var(--text-muted);
          font-size: 11px;
        }
        .spinner {
          width: 28px;
          height: 28px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 700ms linear infinite;
        }
      `}</style>
    </div>
  );
}
