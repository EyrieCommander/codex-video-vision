export interface PlatformInfo {
    os: "macos" | "linux" | "windows";
    arch: "arm64" | "x64";
    gpu: "apple-silicon" | "nvidia" | "none";
    ram_gb: number;
    free_ram_gb: number;
}
export declare function detectPlatform(): PlatformInfo;
export declare function detectGpu(): Promise<PlatformInfo["gpu"]>;
export declare function checkCommand(command: string): Promise<boolean>;
export declare function recommendWhisperModel(ram_gb: number): string;
