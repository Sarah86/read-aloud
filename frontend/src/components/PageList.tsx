import { PdfPage } from "../hooks/usePdfExtractor";

interface Props {
  pages: PdfPage[];
  selectedPage: number;
  listenedPages: Set<number>;
  onSelect: (pageNum: number) => void;
}

export function PageList({ pages, selectedPage, listenedPages, onSelect }: Props) {
  if (pages.length === 0) return null;

  return (
    <div className="page-list">
      <div className="page-list-header">
        <span className="page-list-title">pages</span>
        <span className="page-list-count">{pages.length}</span>
      </div>
      <div className="page-list-scroll">
        {pages.map((page) => {
          const preview = page.text.slice(0, 100).trim();
          const isSelected = page.pageNum === selectedPage;
          const isListened = listenedPages.has(page.pageNum);
          return (
            <button
              key={page.pageNum}
              className={`page-item ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(page.pageNum)}
            >
              <span className="page-num">{page.pageNum}</span>
              <span className="page-preview">{preview}…</span>
              {isListened && <span className="page-listened" title="Listened" />}
            </button>
          );
        })}
      </div>

      <style>{`
        .page-list {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          animation: fadeIn 400ms ease 200ms both;
        }
        .page-list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
        }
        .page-list-title {
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .page-list-count {
          font-size: 11px;
          color: var(--accent-dim);
          font-variant-numeric: tabular-nums;
        }
        .page-list-scroll {
          max-height: 280px;
          overflow-y: auto;
        }
        .page-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid var(--border);
          transition: background var(--transition);
          cursor: pointer;
        }
        .page-item:last-child {
          border-bottom: none;
        }
        .page-item:hover {
          background: var(--bg-elevated);
        }
        .page-item.selected {
          background: var(--accent-glow);
          border-left: 2px solid var(--accent);
        }
        .page-num {
          font-size: 10px;
          color: var(--accent);
          min-width: 20px;
          padding-top: 1px;
          font-variant-numeric: tabular-nums;
        }
        .page-item.selected .page-num {
          color: var(--accent);
        }
        .page-preview {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .page-item.selected .page-preview {
          color: var(--text-primary);
        }
        .page-listened {
          flex-shrink: 0;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          opacity: 0.5;
          margin-left: auto;
          align-self: center;
        }
      `}</style>
    </div>
  );
}
