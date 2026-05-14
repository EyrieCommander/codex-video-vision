import type { AudioResult } from "../types.js";
export declare const OPENAI_TRANSCRIPTION_TIMEOUT_MS = 120000;
export declare function transcribeWithOpenAI(wavPath: string): Promise<AudioResult>;
