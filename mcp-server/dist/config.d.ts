import type { Config } from "./types.js";
export declare const defaultConfig: Config;
export declare function loadConfig(configPath: string): Config;
export declare function saveConfig(configPath: string, config: Config): void;
