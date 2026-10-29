import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), get: vi.fn(), remove: vi.fn(), generate: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    files = { upload: mocks.upload, get: mocks.get, delete: mocks.remove };
    models = { generateContent: mocks.generate };
  },
  createPartFromUri: vi.fn(), createUserContent: vi.fn(), Type: {},
}));
import { analyzeWithGeminiApi } from "../../src/backends/gemini-api.js";
beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "placeholder");
  vi.clearAllMocks();
  mocks.remove.mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
it("deletes an upload whose activation fails", async () => {
  mocks.upload.mockResolvedValue({ name: "files/placeholder", state: "FAILED" });
  await expect(analyzeWithGeminiApi("placeholder.wav")).rejects.toThrow(/processing failed/);
  expect(mocks.remove).toHaveBeenCalledExactlyOnceWith({ name: "files/placeholder" });
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("deletes an upload when polling errors", async () => {
  vi.useFakeTimers();
  mocks.upload.mockResolvedValue({ name: "files/placeholder", state: "PROCESSING" });
  mocks.get.mockRejectedValue(new Error("poll failed"));
  const check = expect(analyzeWithGeminiApi("placeholder.wav")).rejects.toThrow(/poll failed/);
  await vi.advanceTimersByTimeAsync(2001);
  await check;
  expect(mocks.remove).toHaveBeenCalledExactlyOnceWith({ name: "files/placeholder" });
});
