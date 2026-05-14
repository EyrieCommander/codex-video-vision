export interface ExtractAudioOptions {
    startTime?: string;
    endTime?: string;
}
export declare function extractAudio(videoPath: string, outputDir: string, options?: ExtractAudioOptions): Promise<string>;
