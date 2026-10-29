import type { AudioResult } from "../types.js";
export declare function parseHMS(timestamp: string): number;
export declare function formatHMS(seconds: number): string;
/** Preserve subsecond frame identity while keeping whole-second labels stable. */
export declare function formatFrameTimestamp(seconds: number): string;
export declare function extractionDuration(startTime?: string, endTime?: string): number | undefined;
export declare function shiftAudioResult(result: AudioResult, offsetSeconds: number): AudioResult;
