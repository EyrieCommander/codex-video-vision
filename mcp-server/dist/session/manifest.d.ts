import type { SessionManifest } from "../types.js";
type ManifestFrame = {
    timestamp: string;
    file: string;
};
export declare function createManifest(videoHash: string, videoPath: string): SessionManifest;
export declare function mergeFrames(manifest: SessionManifest, resolution: string, newFrames: ManifestFrame[]): SessionManifest;
export declare function getUncachedTimestamps(manifest: SessionManifest, resolution: string, wanted: string[]): string[];
export declare function sampleFrameIndices(totalFrames: number, count: number): number[];
export {};
