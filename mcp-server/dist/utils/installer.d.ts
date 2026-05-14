import type { Backend, WhisperEngine, WhisperModel } from "../types.js";
export interface SetupResult {
    status: "ready" | "missing_dependencies" | "error";
    message: string;
    missing: string[];
    instructions: string[];
}
export declare function checkDependencies(backend: Backend, whisperEngine?: WhisperEngine): Promise<SetupResult>;
export declare function getModelPath(model: WhisperModel): string;
export declare function isModelDownloaded(model: WhisperModel): boolean;
export declare function getModelsDir(): string;
