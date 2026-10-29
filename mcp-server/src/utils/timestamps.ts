import type { AudioResult, AudioTag, TranscriptionSegment } from "../types.js";

export function parseHMS(timestamp: string): number {
  if (!/^\d{2,}:[0-5]\d:[0-5]\d(?:\.\d+)?$/.test(timestamp)) {
    throw new Error(`Invalid HH:MM:SS timestamp: ${timestamp}`);
  }
  const parts = timestamp.split(":").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid HH:MM:SS timestamp: ${timestamp}`);
  }
  const [h, m, s] = parts;
  return h * 3600 + m * 60 + s;
}

export function formatHMS(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Preserve subsecond frame identity while keeping whole-second labels stable. */
export function formatFrameTimestamp(seconds: number): string {
  const rounded = Math.round(Math.max(0, seconds) * 1_000_000) / 1_000_000;
  const fraction = (rounded - Math.floor(rounded)).toFixed(6).slice(1).replace(/0+$/, "");
  return formatHMS(rounded) + (fraction === "." ? "" : fraction);
}

export function extractionDuration(startTime?: string, endTime?: string): number | undefined {
  const start = startTime ? parseHMS(startTime) : 0;
  if (!endTime) return undefined;
  const duration = parseHMS(endTime) - start;
  if (duration <= 0) throw new Error("End time must be after start time");
  return duration;
}

export function shiftAudioResult(
  result: AudioResult,
  offsetSeconds: number,
): AudioResult {
  if (offsetSeconds === 0) {
    return result;
  }

  const shiftSegment = <T extends TranscriptionSegment | AudioTag>(entry: T): T => ({
    ...entry,
    start: formatHMS(parseHMS(entry.start) + offsetSeconds),
    end: formatHMS(parseHMS(entry.end) + offsetSeconds),
  });

  return {
    ...result,
    transcription: result.transcription.map(shiftSegment),
    audio_tags: result.audio_tags.map(shiftSegment),
  };
}
