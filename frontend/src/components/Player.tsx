import { TTSStatus, TTSVoice } from "../hooks/useTTS";

const VOICES: { value: TTSVoice; label: string; desc: string }[] = [
  { value: "nova", label: "Nova", desc: "feminine · warm" },
  { value: "alloy", label: "Alloy", desc: "neutral · clear" },
  { value: "echo", label: "Echo", desc: "masculine · soft" },
  { value: "fable", label: "Fable", desc: "masculine · narrative" },
  { value: "onyx", label: "Onyx", desc: "masculine · deep" },
  { value: "shimmer", label: "Shimmer", desc: "feminine · ethereal" },
];

interface Props {
  status: TTSStatus;
  voice: TTSVoice;
  speed: number;
  currentChunk: number;
  totalChunks: number;
  playbackTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onVoiceChange: (v: TTSVoice) => void;
  onSpeedChange: (s: number) => void;
  hasText: boolean;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function Player({
  status, voice, speed, currentChunk, totalChunks,
  playbackTime, duration,
  onPlay, onPause, onResume, onStop, onSeek,
  onVoiceChange, onSpeedChange, hasText,
}: Props) {
  const isActive = status === "playing" || status === "paused" || status === "loading";

  return (
    <div className="player">
      {/* Waveform viz */}
      <div className={`wave-container ${status === "playing" ? "active" : ""}`}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="wave-bar" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>

      {/* Scrub bar */}
      {isActive && (
        <div className="scrub-row">
          <span className="scrub-time">{formatTime(playbackTime)}</span>
          <input
            type="range"
            className="scrub-bar"
            min={0}
            max={duration || 1}
            step={0.1}
            value={playbackTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            disabled={status === "loading"}
          />
          <span className="scrub-time scrub-duration">{formatTime(duration)}</span>
          {totalChunks > 1 && (
            <span className="scrub-chunk">{currentChunk}/{totalChunks}</span>
          )}
        </div>
      )}

      {/* Main controls */}
      <div className="controls-row">
        {status === "idle" || status === "error" ? (
          <button
            className="btn-play"
            onClick={onPlay}
            disabled={!hasText}
            title="Listen to page"
          >
            <PlayIcon />
            <span>{status === "error" ? "Try again" : "Listen"}</span>
          </button>
        ) : status === "loading" ? (
          <button className="btn-play btn-loading" disabled>
            <div className="mini-spinner" />
            <span>Generating...</span>
          </button>
        ) : status === "playing" ? (
          <>
            <button className="btn-icon" onClick={onPause} title="Pause">
              <PauseIcon />
            </button>
            <button className="btn-icon btn-stop" onClick={onStop} title="Stop">
              <StopIcon />
            </button>
          </>
        ) : (
          <>
            <button className="btn-play" onClick={onResume} title="Resume">
              <PlayIcon />
              <span>Resume</span>
            </button>
            <button className="btn-icon btn-stop" onClick={onStop} title="Stop">
              <StopIcon />
            </button>
          </>
        )}
      </div>

      {/* Settings */}
      <div className="settings-row">
        <div className="setting-group">
          <label className="setting-label">voice</label>
          <select
            value={voice}
            onChange={(e) => onVoiceChange(e.target.value as TTSVoice)}
            disabled={status === "playing" || status === "loading"}
          >
            {VOICES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label} — {v.desc}
              </option>
            ))}
          </select>
        </div>

        <div className="setting-group">
          <label className="setting-label">speed · {speed.toFixed(1)}×</label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            disabled={status === "playing" || status === "loading"}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <style>{`
        .player {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: fadeIn 400ms ease 100ms both;
        }

        .wave-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          height: 24px;
        }
        .wave-bar {
          width: 3px;
          height: 100%;
          background: var(--border-light);
          border-radius: 2px;
          transform: scaleY(0.3);
          transition: background var(--transition);
        }
        .wave-container.active .wave-bar {
          background: var(--accent);
          animation: waveBar 800ms ease-in-out infinite;
        }

        .scrub-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .scrub-time {
          font-size: 10px;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
          min-width: 28px;
        }
        .scrub-duration {
          text-align: right;
        }
        .scrub-chunk {
          font-size: 10px;
          color: var(--accent-dim);
          font-variant-numeric: tabular-nums;
          margin-left: 2px;
        }
        .scrub-bar {
          flex: 1;
          height: 3px;
          accent-color: var(--accent);
          cursor: pointer;
        }
        .scrub-bar:disabled {
          opacity: 0.4;
          cursor: default;
        }

        .controls-row {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
        }

        .btn-play {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--accent);
          color: #0f0f0f;
          border-radius: var(--radius);
          padding: 10px 20px;
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.04em;
          transition: all var(--transition);
        }
        .btn-play:hover:not(:disabled) {
          background: #d9bc85;
          transform: translateY(-1px);
        }
        .btn-play:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn-play.btn-loading {
          background: var(--bg-elevated);
          color: var(--text-secondary);
        }

        .btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: var(--radius);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          color: var(--text-primary);
          transition: all var(--transition);
        }
        .btn-icon:hover {
          border-color: var(--accent-dim);
          color: var(--accent);
        }
        .btn-icon.btn-stop:hover {
          border-color: var(--danger);
          color: var(--danger);
        }

        .mini-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(0,0,0,0.2);
          border-top-color: #0f0f0f;
          border-radius: 50%;
          animation: spin 600ms linear infinite;
        }

        .settings-row {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-top: 4px;
          border-top: 1px solid var(--border);
        }
        .setting-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .setting-label {
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
    </svg>
  );
}
function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
    </svg>
  );
}
