import type { AudioResult, AudioTag, TranscriptionSegment } from "../types.js";
interface GenAiFile {
    name?: string;
    state?: string;
    uri?: string;
    mimeType?: string;
}
interface GenAiFilesApi {
    get(args: {
        name: string;
    }): Promise<GenAiFile>;
    delete(args: {
        name: string;
    }): Promise<void>;
}
interface GenAiClient {
    files: GenAiFilesApi;
}
interface WaitForFileActiveOptions {
    timeoutMs?: number;
    pollIntervalMs?: number;
}
export declare function waitForFileActive(ai: GenAiClient, file: GenAiFile, options?: WaitForFileActiveOptions): Promise<GenAiFile>;
interface ParsedGeminiAudio {
    transcription: TranscriptionSegment[];
    audio_tags: AudioTag[];
}
export declare function parseGeminiAudioResponse(raw: string): ParsedGeminiAudio;
export declare function analyzeWithGeminiApi(audioPath: string): Promise<AudioResult>;
export {};
