import { useState, useRef } from "react";
import { usePdfExtractor } from "./hooks/usePdfExtractor";
import { useTTS } from "./hooks/useTTS";
import { useListenedPages } from "./hooks/useListenedPages";
import { useApiKey } from "./hooks/useApiKey";
import { DropZone } from "./components/DropZone";
import { Player } from "./components/Player";
import { PageList } from "./components/PageList";
import { PasteText } from "./components/PasteText";
import "./App.css";

const AUTOPLAY_KEY = "readaloud:autoplay";

export default function App() {
  const { requiresApiKey, apiKey, setApiKey } = useApiKey();

  const { pages, fileName, docId, loading, error, extractPdf, loadText, reset } =
    usePdfExtractor();
  const {
    status,
    voice,
    speed,
    currentChunk,
    totalChunks,
    playbackTime,
    duration,
    speak,
    pause,
    resume,
    stop,
    seek,
    setVoice,
    setSpeed,
  } = useTTS(apiKey);

  const { listenedPages, markListened } = useListenedPages(docId);

  const [selectedPage, setSelectedPage] = useState(1);
  const [autoPlay, setAutoPlayState] = useState(() => {
    try {
      return localStorage.getItem(AUTOPLAY_KEY) !== "false";
    } catch {
      return true;
    }
  });

  const setAutoPlay = (value: boolean) => {
    setAutoPlayState(value);
    try {
      localStorage.setItem(AUTOPLAY_KEY, String(value));
    } catch {}
  };

  const currentPageText =
    pages.find((p) => p.pageNum === selectedPage)?.text ?? "";

  const handleFile = async (file: File) => {
    stop();
    setSelectedPage(1);
    await extractPdf(file);
  };

  const handlePaste = (text: string) => {
    stop();
    setSelectedPage(1);
    loadText(text);
  };

  const handleReset = () => {
    stop();
    reset();
    setSelectedPage(1);
  };

  const playPage = (pageNum: number) => {
    const text = pages.find((p) => p.pageNum === pageNum)?.text;
    if (!text) return;
    setSelectedPage(pageNum);
    speak(text, { fileName: docId, pageNum }, () => {
      markListened(pageNum);
      // Read through a ref so we use the latest pages/voice/speed/autoPlay,
      // not the values captured when this page started.
      onPageEndRef.current(pageNum);
    });
  };

  const onPageEndRef = useRef<(pageNum: number) => void>(() => {});
  onPageEndRef.current = (pageNum: number) => {
    if (!autoPlay) return;
    const idx = pages.findIndex((p) => p.pageNum === pageNum);
    const next = pages[idx + 1];
    if (idx !== -1 && next) playPage(next.pageNum);
  };

  const handlePlay = () => playPage(selectedPage);

  const handlePageSelect = (pageNum: number) => {
    stop();
    setSelectedPage(pageNum);
  };

  const hasPdf = pages.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">◉</span>
          <span className="logo-text">
            read<em>aloud</em>
          </span>
        </div>
        <div className="header-actions">
          {requiresApiKey && (
            <div className={`api-key-field ${apiKey ? "" : "missing-key"}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
              </svg>
              <input
                type="password"
                placeholder="OpenAI API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          )}
          {hasPdf && (
            <button className="btn-reset" onClick={handleReset} title="New PDF or text">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {!hasPdf ? (
          <div className="empty-state">
            <h1 className="headline">
              Transform text
              <br />
              <em>into natural speech</em>
            </h1>
            <p className="subtitle">
              Upload a PDF or paste text and listen with AI voices
            </p>
            <DropZone onFile={handleFile} loading={loading} />
            {error && <p className="error-msg">{error}</p>}
            <PasteText onSubmit={handlePaste} disabled={loading} />
          </div>
        ) : (
          <div className="reader-layout">
            <div className="file-info">
              <span className="file-icon">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </span>
              <span className="file-name" title={fileName}>
                {fileName}
              </span>
            </div>

            <Player
              status={status}
              voice={voice}
              speed={speed}
              currentChunk={currentChunk}
              totalChunks={totalChunks}
              playbackTime={playbackTime}
              duration={duration}
              onPlay={handlePlay}
              onPause={pause}
              onResume={resume}
              onStop={stop}
              onSeek={seek}
              onVoiceChange={setVoice}
              onSpeedChange={setSpeed}
              autoPlay={autoPlay}
              onAutoPlayChange={setAutoPlay}
              hasText={!!currentPageText}
            />

            <PageList
              pages={pages}
              selectedPage={selectedPage}
              listenedPages={listenedPages}
              onSelect={handlePageSelect}
            />

            {currentPageText && (
              <div className="text-preview">
                <div className="text-preview-header">
                  <span className="text-preview-label">
                    page {selectedPage}
                  </span>
                  <span className="text-preview-chars">
                    {currentPageText.length} chars
                  </span>
                </div>
                <p className="text-preview-body">{currentPageText}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
