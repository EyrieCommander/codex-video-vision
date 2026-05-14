import type { SessionManifest } from "../types.js";
export declare function computeVideoHash(videoPath: string): string;
export declare function getSessionDir(sessionsRoot: string, videoPath: string): string;
export declare function loadManifest(sessionDir: string): SessionManifest | null;
export declare function saveManifest(sessionDir: string, manifest: SessionManifest): void;
export declare function cleanExpiredSessions(sessionsRoot: string, maxAgeDays: number): void;
