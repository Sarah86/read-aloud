import { useState, useRef, useCallback } from "react";
import { getCachedAudio, setCachedAudio } from "../utils/audioCache";

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
export type TTSStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface TTSCacheContext {
  fileName: string;
  pageNum: number;
}

const CHUNK_SIZE = 4000; // chars, below OpenAI's 4096 limit

// 10ms of silence. Played on the Listen tap to "unlock" the audio element:
// mobile browsers (iOS Safari especially) only allow play() inside a user
// gesture, and the real audio arrives seconds later after the TTS request.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

// Break a piece of text that has no sentence boundary into <= size parts,
// preferring whitespace so words aren't cut in half.
function hardSplit(text: string, size: number): string[] {
  const parts: string[] = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf(" ", size);
    if (cut <= 0) cut = size;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}

function splitIntoChunks(text: string, size: number): string[] {
  const chunks: string[] = [];
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .flatMap((s) => (s.length > size ? hardSplit(s, size) : [s]));
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > size) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

function chunkCacheKey(
  ctx: TTSCacheContext,
  chunkIndex: number,
  voice: TTSVoice,
  speed: number
): string {
  return `${ctx.fileName}:p${ctx.pageNum}:c${chunkIndex}:${voice}:${speed}`;
}

export function useTTS(apiKey = "") {
  const [status, setStatus] = useState<TTSStatus>("idle");
  const [voice, setVoice] = useState<TTSVoice>("nova");
  const [speed, setSpeed] = useState(1.0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const apiKeyRef = useRef(apiKey);
  apiKeyRef.current = apiKey;

  // A single audio element reused for every chunk and page. Once it has been
  // played inside a tap, the browser lets it play again later without one,
  // which is what makes the first Listen and auto-play work on mobile.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const getAudio = () => (audioRef.current ??= new Audio());
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  // Incremented on every speak/stop. Async work from an older run compares its
  // captured id against this and bails out, so a slow fetch from a previous
  // page can never start playing over the current one.
  const runIdRef = useRef(0);
  const urlRef = useRef<string | null>(null);

  const stopAudio = useCallback(() => {
    runIdRef.current++;
    const audio = audioRef.current;
    if (audio) {
      // Detach handlers first: clearing the source fires events (e.g. error)
      // that would otherwise flip the UI to "Try again".
      audio.onplay = audio.onloadedmetadata = audio.ontimeupdate = null;
      audio.onended = audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setStatus("idle");
    setCurrentChunk(0);
    setTotalChunks(0);
    setPlaybackTime(0);
    setDuration(0);
  }, []);

  const fetchAndPlayChunk = useCallback(
    async (
      chunks: string[],
      index: number,
      ctx: TTSCacheContext | null,
      runId: number,
      onEnd?: () => void
    ) => {
      const aborted = () => runIdRef.current !== runId;
      if (aborted()) return;
      if (index >= chunks.length) {
        setStatus("idle");
        setCurrentChunk(0);
        setTotalChunks(0);
        onEnd?.();
        return;
      }

      setStatus("loading");
      setCurrentChunk(index + 1);

      try {
        const cacheKey = ctx
          ? chunkCacheKey(ctx, index, voice, speed)
          : null;

        let audioBuffer: ArrayBuffer | null = cacheKey
          ? await getCachedAudio(cacheKey)
          : null;

        if (!audioBuffer) {
          const response = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: chunks[index], voice, speed, apiKey: apiKeyRef.current || undefined }),
          });

          if (!response.ok) throw new Error("TTS request failed");
          if (aborted()) return;

          audioBuffer = await response.arrayBuffer();

          if (cacheKey) setCachedAudio(cacheKey, audioBuffer);
        }

        if (aborted()) return;

        const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = getAudio();
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;

        // Ignore events still queued from the previous source (e.g. the
        // silent unlock clip ending), which would otherwise skip a chunk.
        const current = () => !aborted() && audio.src === url;
        audio.onplay = () => current() && setStatus("playing");
        audio.onloadedmetadata = () => current() && setDuration(audio.duration);
        audio.ontimeupdate = () => current() && setPlaybackTime(audio.currentTime);
        audio.onended = () => {
          if (!current()) return;
          setPlaybackTime(0);
          setDuration(0);
          fetchAndPlayChunk(chunks, index + 1, ctx, runId, onEnd);
        };
        audio.onerror = () => {
          if (current()) setStatus("error");
        };

        audio.src = url;
        await audio.play();
      } catch {
        if (!aborted()) setStatus("error");
      }
    },
    [voice, speed]
  );

  // onEnd fires only when every chunk has played through naturally — not on
  // stop(), a new speak(), or an error.
  const speak = useCallback(
    async (
      text: string,
      ctx: TTSCacheContext | null = null,
      onEnd?: () => void
    ) => {
      stopAudio();
      const runId = runIdRef.current;

      // Must run synchronously in the tap handler, before any await.
      const audio = getAudio();
      audio.src = SILENT_WAV;
      audio.play().catch(() => {});

      const chunks = splitIntoChunks(text, CHUNK_SIZE);
      chunksRef.current = chunks;
      chunkIndexRef.current = 0;
      setTotalChunks(chunks.length);

      fetchAndPlayChunk(chunks, 0, ctx, runId, onEnd);
    },
    [fetchAndPlayChunk, stopAudio]
  );

  const pause = useCallback(() => {
    if (audioRef.current && status === "playing") {
      audioRef.current.pause();
      setStatus("paused");
    }
  }, [status]);

  const resume = useCallback(() => {
    if (audioRef.current && status === "paused") {
      audioRef.current.play();
      setStatus("playing");
    }
  }, [status]);

  const stop = useCallback(() => {
    stopAudio();
  }, [stopAudio]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setPlaybackTime(time);
    }
  }, []);

  return {
    status,
    voice,
    setVoice,
    speed,
    setSpeed,
    currentChunk,
    totalChunks,
    playbackTime,
    duration,
    speak,
    pause,
    resume,
    stop,
    seek,
  };
}
