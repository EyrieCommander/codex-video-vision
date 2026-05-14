import { mkdirSync, readFileSync, rmSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const mcpRoot = resolve(scriptDir, "..");
const repoRoot = resolve(mcpRoot, "..");
const fixture = resolve(mcpRoot, "tests/fixtures/test-3s.mp4");
const smokeHome = "/private/tmp/codex-video-vision-smoke-home";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function textAt(result, index) {
  const item = result.content[index];
  assert(item?.type === "text" && typeof item.text === "string", `Expected text content at index ${index}`);
  return item.text;
}

const mcpConfig = JSON.parse(readFileSync(resolve(repoRoot, ".mcp.json"), "utf8"))["codex-video-vision"];
assert(mcpConfig?.command && Array.isArray(mcpConfig.args), "Missing codex-video-vision entry in .mcp.json");

rmSync(smokeHome, { recursive: true, force: true });
mkdirSync(smokeHome, { recursive: true });

const transport = new StdioClientTransport({
  command: mcpConfig.command,
  args: mcpConfig.args,
  cwd: repoRoot,
  env: {
    PATH: process.env.PATH ?? "",
    HOME: smokeHome,
  },
  stderr: "pipe",
});

const stderr = [];
transport.stderr?.on("data", (chunk) => stderr.push(String(chunk)));

const client = new Client({
  name: "codex-video-vision-smoke",
  version: "0.0.0",
});

try {
  await client.connect(transport);

  const server = client.getServerVersion();
  assert(server?.name === "codex-video-vision", "Unexpected MCP server name");
  assert(server.version === "0.1.0", "Unexpected MCP server version");

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name).sort();
  for (const expected of ["video_analyze", "video_configure", "video_detail", "video_info", "video_setup", "video_watch"]) {
    assert(toolNames.includes(expected), `Missing tool: ${expected}`);
  }

  const info = JSON.parse(textAt(await client.callTool({
    name: "video_info",
    arguments: { path: fixture },
  }), 0));
  assert(info.duration_seconds === 3, "video_info returned unexpected duration");
  assert(info.resolution === "320x240", "video_info returned unexpected resolution");

  const analyze = JSON.parse(textAt(await client.callTool({
    name: "video_analyze",
    arguments: {
      path: fixture,
      filters: {
        scene_changes: true,
        silence: true,
        motion: true,
        transcription: false,
      },
    },
  }), 0));
  assert(analyze.metadata?.duration_seconds === 3, "video_analyze omitted metadata");
  assert(analyze.analysis?.content_profile, "video_analyze omitted content profile");

  const watchImages = await client.callTool({
    name: "video_watch",
    arguments: {
      path: fixture,
      skip_audio: true,
      fps: 1,
      resolution: 256,
      frame_mode: "images",
    },
  });
  assert(watchImages.content.filter((item) => item.type === "image").length > 0, "video_watch image mode returned no images");

  const watchDescriptions = await client.callTool({
    name: "video_watch",
    arguments: {
      path: fixture,
      skip_audio: true,
      fps: 1,
      resolution: 256,
      frame_mode: "descriptions",
    },
  });
  assert(watchDescriptions.content.filter((item) => item.type === "image").length === 0, "description mode should not attach images");

  const detail = await client.callTool({
    name: "video_detail",
    arguments: {
      path: fixture,
      segments: [{ start: "00:00:00", end: "00:00:03", fps: 1, resolution: 256 }],
      view_sample: 2,
    },
  });
  assert(detail.content.filter((item) => item.type === "image").length === 2, "video_detail returned unexpected image count");

  console.log(JSON.stringify({
    server,
    tools: toolNames,
    video: {
      duration_seconds: info.duration_seconds,
      resolution: info.resolution,
    },
    watch_images: watchImages.content.filter((item) => item.type === "image").length,
    watch_descriptions_images: watchDescriptions.content.filter((item) => item.type === "image").length,
    detail_images: detail.content.filter((item) => item.type === "image").length,
  }, null, 2));

  await client.close();
} catch (error) {
  if (stderr.length > 0) {
    console.error(stderr.join(""));
  }
  await transport.close().catch(() => {});
  throw error;
}
