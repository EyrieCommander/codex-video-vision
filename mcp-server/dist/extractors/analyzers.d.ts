import type { AnalysisFilters, SceneChange, Interval } from "../types.js";
export interface AnalysisCommandResult {
    args: string[];
    videoMetaFile: string;
}
/**
 * Builds an ffmpeg args array that runs the selected lavfi filter pipeline and
 * writes per-frame metadata to files.  Transcription is NOT an ffmpeg filter —
 * the caller must handle it separately.
 *
 * Returns `null` when no ffmpeg-based filter is selected.
 */
export declare function buildAnalysisCommand(videoPath: string, filters: AnalysisFilters, workDir: string): AnalysisCommandResult | null;
export declare function parseScdetOutput(stderr: string): SceneChange[];
export declare function parseScdetFromMetaFile(content: string, threshold?: number): SceneChange[];
export declare function parseBlackdetectOutput(stderr: string): Interval[];
export declare function parseSilenceOutput(stderr: string): Interval[];
export declare function parseFreezeOutput(stderr: string): Interval[];
export declare function parseSitiOutput(stderr: string): {
    siAvg?: number;
    tiAvg?: number;
};
export declare function parseBlurOutput(metaFileContent: string): Array<{
    timestamp: string;
    blur: number;
}>;
export declare function parseSignalstatsOutput(metaFileContent: string): Array<{
    timestamp: string;
    brightness?: number;
    saturation?: number;
}>;
export declare function parseEbur128Output(stderr: string): {
    mean_lufs: number;
    range_lu: number;
} | undefined;
export declare function deriveContentProfile(siAvg?: number, tiAvg?: number): string;
