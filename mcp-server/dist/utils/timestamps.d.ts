import type { AudioResult } from "../types.js";
export declare function parseHMS(timestamp: string): number;
export declare function formatHMS(seconds: number): string;
export declare function shiftAudioResult(result: AudioResult, offsetSeconds: number): AudioResult;
