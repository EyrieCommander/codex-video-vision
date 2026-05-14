import type { AudioResult } from "../types.js";
import type { WhisperEngine, WhisperModel } from "../types.js";
export interface WhisperOptions {
    engine: WhisperEngine;
    model: WhisperModel;
    whisperAt: boolean;
    modelDir: string;
}
export declare function transcribeWithWhisper(wavPath: string, options: WhisperOptions): Promise<AudioResult>;
