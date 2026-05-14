export declare function parseEnvFile(contents: string): Record<string, string>;
export declare function loadEnvFile(path: string): string[];
export declare function candidateEnvFiles(cwd?: string): string[];
export declare function loadEnvFiles(paths?: string[]): string[];
