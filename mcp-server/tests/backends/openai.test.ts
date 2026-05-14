import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  OPENAI_TRANSCRIPTION_TIMEOUT_MS,
  transcribeWithOpenAI,
} from "../../src/backends/openai.js";

const { createMock, clientOptions } = vi.hoisted(() => ({
  createMock: vi.fn(),
  clientOptions: [] as unknown[],
}));

vi.mock("openai", () => ({
  default: class FakeOpenAI {
    audio = {
      transcriptions: {
        create: createMock,
      },
    };

    constructor(options: unknown) {
      clientOptions.push(options);
    }
  },
}));

const TEST_DIR = mkdtempSync(join(tmpdir(), "cvv-openai-test-"));

describe("transcribeWithOpenAI", () => {
  const wavPath = join(TEST_DIR, "audio.wav");
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    writeFileSync(wavPath, "fake wav");
    clientOptions.length = 0;
    createMock.mockResolvedValue({
      segments: [
        { start: 1.5, end: 3, text: " First line. " },
      ],
    });
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
    createMock.mockReset();
  });

  it("configures a bounded OpenAI client and maps segment timestamps", async () => {
    const result = await transcribeWithOpenAI(wavPath);

    expect(clientOptions[0]).toEqual({
      apiKey: "test-key",
      timeout: OPENAI_TRANSCRIPTION_TIMEOUT_MS,
      maxRetries: 1,
    });
    expect(createMock).toHaveBeenCalledWith({
      model: "whisper-1",
      file: expect.any(File),
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });
    expect(result).toEqual({
      backend: "openai",
      transcription: [
        { start: "00:00:01", end: "00:00:03", text: "First line." },
      ],
      audio_tags: [],
      full_analysis: null,
    });
  });

  it("throws a setup hint when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(transcribeWithOpenAI(wavPath)).rejects.toThrow(
      /OPENAI_API_KEY environment variable is not set/,
    );
  });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});
