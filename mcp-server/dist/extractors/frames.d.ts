import type { VideoMetadata, Frame, Segment } from "../types.js";
export declare function getVideoMetadata(videoPath: string): Promise<VideoMetadata>;
export declare function calculateAutoFps(durationSeconds: number): number;
export interface ExtractFramesOptions {
    fps: number;
    resolution: number;
    outputDir: string;
    startTime?: string;
    endTime?: string;
    maxFrames?: number;
}
export declare function extractFrames(videoPath: string, options: ExtractFramesOptions): Promise<Frame[]>;
export interface SegmentFrame extends Frame {
    resolution: number;
}
/**
 * Generates HH:MM:SS timestamp strings for every sample point within a
 * segment according to the segment's fps setting.
 *
 * The range is [start, end) — the end boundary is exclusive so that a segment
 * ending exactly at the next segment's start time never overlaps.
 */
export declare function generateTimestampsForSegment(segment: Segment): string[];
/**
 * Extracts frames for an ordered list of segments, each potentially at a
 * different resolution and fps.  Frames from each segment are written into a
 * sub-directory named after their resolution so they never collide.
 */
export declare function extractFramesBySegments(videoPath: string, segments: Segment[], baseOutputDir: string): Promise<SegmentFrame[]>;
