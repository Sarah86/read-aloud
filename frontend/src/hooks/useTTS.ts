import { useState, useRef, useCallback } from "react";
import { getCachedAudio, setCachedAudio } from "../utils/audioCache";

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
export type TTSStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface TTSCacheContext {
  fileName: string;
  pageNum: number;
}

const CHUNK_SIZE = 4000; // chars, below OpenAI's 4096 limit

function splitIntoChunks(text: string, size: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  const abortRef = useRef(false);

  const stopAudio = useCallback(() => {
    abortRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
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
      ctx: TTSCacheContext | null
    ) => {
      if (abortRef.current || index >= chunks.length) {
        if (!abortRef.current) setStatus("idle");
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
          if (abortRef.current) return;

          audioBuffer = await response.arrayBuffer();

          if (cacheKey) setCachedAudio(cacheKey, audioBuffer);
        }

        if (abortRef.current) return;

        const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onplay = () => setStatus("playing");
        audio.onloadedmetadata = () => setDuration(audio.duration);
        audio.ontimeupdate = () => setPlaybackTime(audio.currentTime);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (!abortRef.current) {
            setPlaybackTime(0);
            setDuration(0);
            fetchAndPlayChunk(chunks, index + 1, ctx);
          }
        };
        audio.onerror = () => setStatus("error");

        await audio.play();
      } catch {
        if (!abortRef.current) setStatus("error");
      }
    },
    [voice, speed]
  );

  const speak = useCallback(
    async (text: string, ctx: TTSCacheContext | null = null) => {
      stopAudio();
      abortRef.current = false;

      const chunks = splitIntoChunks(text, CHUNK_SIZE);
      chunksRef.current = chunks;
      chunkIndexRef.current = 0;
      setTotalChunks(chunks.length);

      fetchAndPlayChunk(chunks, 0, ctx);
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
