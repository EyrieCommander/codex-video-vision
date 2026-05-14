import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export interface DeriveFpsParams {
    fps: number | "auto";
    view_sample?: number;
    start_time?: string;
    end_time?: string;
    segments?: {
        start: string;
        end: string;
    }[];
    duration_seconds: number;
}
export declare function deriveFps(params: DeriveFpsParams): number;
export declare function registerVideoWatch(server: McpServer): void;
