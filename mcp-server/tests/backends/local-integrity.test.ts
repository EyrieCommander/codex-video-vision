import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const mocks = vi.hoisted(() => ({ run: vi.fn(), trustFixture: false }));
vi.mock("child_process", () => ({
  execFile: (command: string, args: string[], options: unknown, cb: Function) => {
    Promise.resolve().then(() => mocks.run(command, args, options))
      .then((result) => cb(null, result), (err) => cb(err));
  },
}));
vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto");
  return { ...actual, createHash: (...args: Parameters<typeof actual.createHash>) => {
    const hash = actual.createHash(...args);
    if (mocks.trustFixture) vi.spyOn(hash, "digest").mockReturnValue(
      "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21" as any,
    );
    return hash;
  } };
});
import { transcribeWithWhisper } from "../../src/backends/local.js";

let scratch: string;
beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "cvv-whisper-integrity-"));
  mocks.run.mockReset();
  mocks.trustFixture = false;
});
afterEach(() => { rmSync(scratch, { recursive: true, force: true }); });
const options = () => ({ engine: "cpp" as const, model: "tiny" as const, whisperAt: false, modelDir: scratch });

describe("Whisper model integrity", () => {
  it("rejects corrupt downloads on every retry without publishing or invoking Whisper", async () => {
    mocks.run.mockImplementation((command, args) => {
      expect(command).toBe("curl");
      expect(existsSync(join(scratch, "ggml-tiny.bin"))).toBe(false);
      writeFileSync(args[args.indexOf("-o") + 1], "corrupt fixture");
      return { stdout: "", stderr: "" };
    });
    for (let i = 0; i < 2; i++) {
      await expect(transcribeWithWhisper("unused.wav", options())).rejects.toThrow(/checksum mismatch/);
      expect(readdirSync(scratch)).toEqual([]);
    }
    expect(mocks.run).toHaveBeenCalledTimes(2);
  });

  it("rejects a corrupt legacy cache on every request", async () => {
    writeFileSync(join(scratch, "ggml-tiny.bin"), "legacy corrupt fixture");
    for (let i = 0; i < 2; i++) {
      await expect(transcribeWithWhisper("unused.wav", options())).rejects.toThrow(/checksum mismatch/);
    }
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("cleans interrupted downloads", async () => {
    mocks.run.mockImplementation((_command, args) => {
      writeFileSync(args[args.indexOf("-o") + 1], "partial");
      throw new Error("download interrupted");
    });
    await expect(transcribeWithWhisper("unused.wav", options())).rejects.toThrow(/interrupted/);
    expect(readdirSync(scratch)).toEqual([]);
  });
});

describe("Whisper JSON contracts", () => {
  it("reads Python JSON instead of transcript stdout, and removes the companion file", async () => {
    const wav = join(scratch, "clip.wav");
    const json = join(scratch, "clip.json");
    mocks.run.mockImplementation(() => {
      writeFileSync(json, JSON.stringify({ segments: [{ start: 1, end: 2, text: "JSON speech" }] }));
      return { stdout: "untimed stdout", stderr: "" };
    });
    const result = await transcribeWithWhisper(wav, { ...options(), engine: "python" });
    expect(result.transcription).toEqual([{ start: "00:00:01", end: "00:00:02", text: "JSON speech" }]);
    expect(existsSync(json)).toBe(false);
  });

  it("reads cpp output JSON and millisecond offsets", async () => {
    // Only this contract test stubs the digest; rejection tests hash real bytes.
    mocks.trustFixture = true;
    writeFileSync(join(scratch, "ggml-tiny.bin"), "model fixture");
    const wav = join(scratch, "clip.wav");
    mocks.run.mockImplementation((command, args) => {
      expect(command).toBe("whisper-cli");
      const output = args[args.indexOf("--output-file") + 1];
      writeFileSync(`${output}.json`, JSON.stringify({ transcription: [
        { timestamps: { from: "00:00:01.000", to: "00:00:02.000" }, offsets: { from: 1000, to: 2000 }, text: " cpp speech " },
        { timestamps: { from: "00:00:03,000", to: "00:00:04,000" }, text: "timestamps only" },
      ] }));
      return { stdout: "untimed stdout", stderr: "" };
    });
    const result = await transcribeWithWhisper(wav, options());
    expect(result.transcription).toEqual([
      { start: "00:00:01", end: "00:00:02", text: "cpp speech" },
      { start: "00:00:03", end: "00:00:04", text: "timestamps only" },
    ]);
    expect(existsSync(`${wav}.json`)).toBe(false);
    expect(readFileSync(join(scratch, "ggml-tiny.bin"), "utf-8")).toBe("model fixture");
  });
});
