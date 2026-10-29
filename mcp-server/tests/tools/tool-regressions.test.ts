import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, existsSync, readdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { z } from "zod";

const state = vi.hoisted(() => ({
  scratch: "", config: {} as Record<string, unknown>, manifest: null as any,
  frames: vi.fn(), segments: vi.fn(), audio: vi.fn(), transcribe: vi.fn(), save: vi.fn(), run: vi.fn(),
}));
vi.mock("os", async () => {
  const actual = await vi.importActual<typeof import("os")>("os");
  return { ...actual, tmpdir: () => state.scratch || actual.tmpdir(), homedir: () => "/placeholder-home" };
});
vi.mock("../../src/config.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/config.js")>("../../src/config.js");
  return { ...actual, loadConfig: () => ({ ...actual.defaultConfig, ...state.config }) };
});
vi.mock("../../src/utils/validation.js", () => ({ validateVideoPath: (path: string) => path }));
vi.mock("../../src/extractors/frames.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/extractors/frames.js")>("../../src/extractors/frames.js");
  return { ...actual, getVideoMetadata: async () => ({ duration_seconds: 3, has_audio: true }),
    extractFrames: state.frames, extractFramesBySegments: state.segments };
});
vi.mock("../../src/extractors/audio.js", () => ({ extractAudio: state.audio }));
vi.mock("../../src/backends/openai.js", () => ({ transcribeWithOpenAI: state.transcribe }));
vi.mock("../../src/session/manager.js", () => ({
  getSessionDir: () => join(state.scratch, "session"), computeVideoHash: () => "hash",
  loadManifest: () => state.manifest, saveManifest: state.save,
}));
vi.mock("child_process", () => ({
  execFile: (command: string, args: string[], options: unknown, cb: Function) => {
    Promise.resolve().then(() => state.run(command, args, options))
      .then((result) => cb(null, result), (err) => cb(err));
  },
}));
import { registerVideoWatch } from "../../src/tools/video-watch.js";
import { registerVideoDetail } from "../../src/tools/video-detail.js";
import { registerVideoAnalyze } from "../../src/tools/video-analyze.js";
import { registerVideoConfigure } from "../../src/tools/video-configure.js";

function tool(register: Function) {
  let schema: z.ZodObject<any>;
  let handler: Function;
  register({ tool: (_name: string, _description: string, shape: any, fn: Function) => {
    schema = z.object(shape); handler = fn;
  } });
  return { schema: () => schema!, call: (args: any) => handler!(schema!.parse(args)) };
}
let parent: string;
beforeEach(() => {
  parent = tmpdir();
  state.scratch = mkdtempSync(join(parent, "cvv-tool-regressions-"));
  state.config = { enable_index: false, backend: "openai", max_frames: 2 };
  state.manifest = null;
  for (const fn of [state.frames, state.segments, state.audio, state.transcribe, state.save, state.run]) fn.mockReset();
  state.frames.mockResolvedValue([]);
  state.segments.mockResolvedValue([]);
  state.audio.mockImplementation(async (_path, dir) => join(dir, "audio.wav"));
  state.transcribe.mockResolvedValue({ backend: "openai", transcription: [], audio_tags: [], full_analysis: null });
});
afterEach(() => {
  rmSync(state.scratch, { recursive: true, force: true });
  state.scratch = "";
});

describe("watch failure cleanup", () => {
  it("waits for extraction after audio failure, then removes all scratch media", async () => {
    let work = "";
    state.frames.mockImplementation(async (_path, options) => {
      work = dirname(options.outputDir);
      expect(existsSync(work)).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 20));
      mkdirSync(options.outputDir);
      writeFileSync(join(options.outputDir, "frame.jpg"), "private fixture");
      return [];
    });
    state.transcribe.mockRejectedValue(new Error("backend failed"));
    await expect(tool(registerVideoWatch).call({ path: "fixture.mp4" })).rejects.toThrow(/backend failed/);
    expect(existsSync(work)).toBe(false);
    expect(readdirSync(state.scratch)).toEqual([]);
  });

  it("cleans up when session persistence fails", async () => {
    state.config.enable_index = true;
    state.save.mockImplementation(() => { throw new Error("save failed"); });
    await expect(tool(registerVideoWatch).call({ path: "fixture.mp4", skip_audio: true })).rejects.toThrow(/save failed/);
    expect(readdirSync(state.scratch)).toEqual([]);
  });
});

it("uses configured default fps when omitted, and honors explicit auto", async () => {
  state.config.default_fps = 0.5;
  const watch = tool(registerVideoWatch);
  await watch.call({ path: "fixture.mp4", skip_audio: true });
  expect(state.frames.mock.calls[0][1].fps).toBe(0.5);
  await watch.call({ path: "fixture.mp4", skip_audio: true, fps: "auto" });
  expect(state.frames.mock.calls[1][1].fps).toBe(2);
});

it("passes the configured aggregate segment budget to both tools", async () => {
  const args = { path: "fixture.mp4", segments: [{ start: "00:00:00", end: "00:00:03", fps: 1 }] };
  await tool(registerVideoWatch).call({ ...args, skip_audio: true });
  await tool(registerVideoDetail).call(args);
  expect(state.segments.mock.calls.map((call) => call[3])).toEqual([2, 2]);
});

it("keeps subsecond cache files and manifest entries distinct", async () => {
  state.config.enable_index = true;
  state.frames.mockResolvedValue([
    { timestamp: "00:00:00", image: Buffer.from("first").toString("base64") },
    { timestamp: "00:00:00.5", image: Buffer.from("second").toString("base64") },
  ]);
  await tool(registerVideoWatch).call({ path: "fixture.mp4", skip_audio: true, resolution: 128 });
  const manifest = state.save.mock.calls[0][1];
  expect(manifest.resolutions["128"].frames).toHaveLength(2);
  const files = manifest.resolutions["128"].frames.map((f: any) => readFileSync(f.file, "utf-8"));
  expect(files).toEqual(["first", "second"]);
});

it("samples cached detail frames across the full timeline and caps responses", async () => {
  state.config.enable_index = true;
  state.manifest = { video_hash: "hash", resolutions: { "128": { frames: [0, 1, 2, 3].map((i) => {
    const file = join(state.scratch, `${i}.jpg`);
    writeFileSync(file, `frame ${i}`);
    return { timestamp: `00:00:0${i}`, file };
  }) } } };
  const result = await tool(registerVideoDetail).call({ path: "fixture.mp4", view_sample: 100 });
  expect(result.content.filter((c: any) => c.type === "image").map((c: any) => Buffer.from(c.data, "base64").toString()))
    .toEqual(["frame 0", "frame 3"]);
});

it("propagates failed analysis subprocesses and removes scratch files", async () => {
  state.run.mockRejectedValue(Object.assign(new Error("decoder failed"), { stderr: "partial analysis", code: 23 }));
  await expect(tool(registerVideoAnalyze).call({ path: "fixture.mp4", filters: { motion: true } }))
    .rejects.toThrow(/decoder failed/);
  expect(readdirSync(state.scratch)).toEqual([]);
});

it("rejects fractional counts in tool schemas and accepts fractional cache lookups", () => {
  expect(tool(registerVideoWatch).schema().safeParse({ path: "x", view_sample: 1.5 }).success).toBe(false);
  expect(tool(registerVideoDetail).schema().safeParse({ path: "x", view_sample: 1.5 }).success).toBe(false);
  expect(tool(registerVideoConfigure).schema().safeParse({ max_frames: 1.5 }).success).toBe(false);
  expect(tool(registerVideoDetail).schema().safeParse({ path: "x", view: ["00:00:00.5"] }).success).toBe(true);
});
