export function createManifest(videoHash, videoPath) {
    return {
        video_hash: videoHash,
        video_path: videoPath,
        created_at: new Date().toISOString(),
        resolutions: {},
    };
}
export function mergeFrames(manifest, resolution, newFrames) {
    const existing = manifest.resolutions[resolution]?.frames ?? [];
    const seen = new Set(existing.map((f) => f.timestamp));
    const deduped = [...existing];
    for (const frame of newFrames) {
        if (!seen.has(frame.timestamp)) {
            deduped.push(frame);
            seen.add(frame.timestamp);
        }
    }
    deduped.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return {
        ...manifest,
        resolutions: { ...manifest.resolutions, [resolution]: { frames: deduped } },
    };
}
export function getUncachedTimestamps(manifest, resolution, wanted) {
    const cached = new Set((manifest.resolutions[resolution]?.frames ?? []).map((f) => f.timestamp));
    return wanted.filter((ts) => !cached.has(ts));
}
export function sampleFrameIndices(totalFrames, count) {
    if (totalFrames === 0)
        return [];
    if (count >= totalFrames)
        return Array.from({ length: totalFrames }, (_, i) => i);
    if (count === 1)
        return [0];
    const indices = [];
    for (let i = 0; i < count; i++) {
        indices.push(Math.round((i * (totalFrames - 1)) / (count - 1)));
    }
    return indices;
}
