#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { join } from "path";
import { homedir } from "os";
import { registerVideoWatch } from "./tools/video-watch.js";
import { registerVideoInfo } from "./tools/video-info.js";
import { registerVideoSetup } from "./tools/video-setup.js";
import { registerVideoConfigure } from "./tools/video-configure.js";
import { registerVideoAnalyze } from "./tools/video-analyze.js";
import { registerVideoDetail } from "./tools/video-detail.js";
import { loadConfig } from "./config.js";
import { cleanExpiredSessions } from "./session/manager.js";
import { loadEnvFiles } from "./utils/env.js";
loadEnvFiles();
const server = new McpServer({
    name: "codex-video-vision",
    version: "0.1.0",
});
registerVideoWatch(server);
registerVideoInfo(server);
registerVideoSetup(server);
registerVideoConfigure(server);
registerVideoAnalyze(server);
registerVideoDetail(server);
const CONFIG_PATH = join(homedir(), ".codex-video-vision", "config.json");
const config = loadConfig(CONFIG_PATH);
if (config.enable_index) {
    const sessionsDir = join(homedir(), ".codex-video-vision", "sessions");
    cleanExpiredSessions(sessionsDir, config.session_max_age_days);
}
const transport = new StdioServerTransport();
await server.connect(transport);
