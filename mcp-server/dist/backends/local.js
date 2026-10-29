import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync, mkdirSync, rmSync, createReadStream, mkdtempSync, renameSync, readFileSync } from "fs";
import { createHash } from "crypto";
import { basename, dirname, join } from "path";
import { pipeline } from "node:stream/promises";
import { detectPlatform, recommendWhisperModel } from "../utils/platform.js";
import { formatHMS, parseHMS } from "../utils/timestamps.js";
const execFileAsync = promisify(execFile);
function resolveModel(model) {
    if (model === "auto") {
        return recommendWhisperModel(detectPlatform().ram_gb);
    }
    return model;
}
export async function transcribeWithWhisper(wavPath, options) {
    const { engine, model, whisperAt, modelDir } = options;
    if (engine === "cpp") {
        return transcribeWithWhisperCpp(wavPath, model, modelDir);
    }
    return transcribeWithWhisperPython(wavPath, model, whisperAt);
}
async function transcribeWithWhisperCpp(wavPath, model, modelDir) {
    const resolved = resolveModel(model);
    const modelPath = `${modelDir}/ggml-${resolved}.bin`;
    // SHA-256 checksums verified against HuggingFace Git LFS pointers
    const KNOWN_CHECKSUMS = {
        "tiny": "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21",
        "tiny.en": "921e4cf8686fdd993dcd081a5da5b6c365bfde1162e72b08d75ac75289920b1f",
        "base": "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe",
        "base.en": "a03779c86df3323075f5e796cb2ce5029f00ec8869eee3fdfb897afe36c6d002",
        "small": "1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b",
        "small.en": "c6138d6d58ecc8322097e0f987c32f1be8bb0a18532a3f88f734d1bbf9c41e5d",
        "medium": "6c14d5adee5f86394037b4e4e8b59f1673b6cee10e3cf0b11bbdbee79c156208",
        "medium.en": "cc37e93478338ec7700281a7ac30a10128929eb8f427dda2e865faa8f6da4356",
        "large-v1": "7d99f41a10525d0206bddadd86760181fa920438b6b33237e3118ff6c83bb53d",
        "large-v2": "9a423fe4d40c82774b6af34115b8b935f34152246eb19e80e376071d3f999487",
        "large-v3": "64d182b440b98d5203c4f9bd541544d84c605196c4f7b845dfa11fb23594d1e2",
        "large-v3-turbo": "1fc70f774d38eb169993ac391eea357ef47c88757ef72ee5943879b7e8e2bc69",
    };
    const expectedSha = KNOWN_CHECKSUMS[resolved];
    if (!expectedSha)
        throw new Error(`No known checksum for model "${resolved}"`);
    const verifyModel = async (path) => {
        const hash = createHash("sha256");
        await pipeline(createReadStream(path), hash);
        if (hash.digest("hex") !== expectedSha) {
            throw new Error(`Model checksum mismatch for ggml-${resolved}.bin`);
        }
    };
    if (!existsSync(modelPath)) {
        mkdirSync(modelDir, { recursive: true });
        // Only publish verified bytes. Each request owns its download scratch path.
        const downloadDir = mkdtempSync(join(modelDir, ".download-"));
        const downloadPath = join(downloadDir, "model.bin");
        try {
            const downloadUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${resolved}.bin`;
            await execFileAsync("curl", ["--fail", "-L", "-o", downloadPath, downloadUrl], {
                timeout: 600_000,
            });
            await verifyModel(downloadPath);
            renameSync(downloadPath, modelPath);
        }
        finally {
            rmSync(downloadDir, { recursive: true, force: true });
        }
    }
    else {
        // Recheck legacy caches too: earlier versions left failed downloads here.
        await verifyModel(modelPath);
    }
    const jsonPath = `${wavPath}.json`;
    try {
        await execFileAsync("whisper-cli", [
            "--model", modelPath,
            "--file", wavPath,
            "--output-json",
            "--output-file", wavPath,
            "--language", "auto",
        ], { timeout: 600_000, maxBuffer: 50 * 1024 * 1024 });
        return parseWhisperOutput(readFileSync(jsonPath, "utf-8"));
    }
    finally {
        rmSync(jsonPath, { force: true });
    }
}
async function transcribeWithWhisperPython(wavPath, model, whisperAt) {
    const command = whisperAt ? "whisper-at" : "whisper";
    // openai-whisper Python CLI does not accept "auto" for --language;
    // omitting the flag triggers the built-in language auto-detection from
    // the first 30 seconds of audio, which is the behavior we want.
    //
    // We also pin --output_dir to the same scratch directory as the wav
    // input so whisper's side-effect JSON file lands in our temp dir and
    // gets reaped with it, instead of polluting the user's CWD.
    const outputDir = dirname(wavPath);
    const jsonPath = join(outputDir, basename(wavPath, ".wav") + ".json");
    try {
        await execFileAsync(command, [
            wavPath,
            "--model", model,
            "--output_format", "json",
            "--output_dir", outputDir,
        ], { timeout: 600_000, maxBuffer: 50 * 1024 * 1024 });
        return parseWhisperOutput(readFileSync(jsonPath, "utf-8"));
    }
    finally {
        rmSync(jsonPath, { force: true });
    }
}
function whisperTimestamp(segment, edge) {
    if (typeof segment[edge] === "number")
        return formatHMS(segment[edge]);
    const cppEdge = edge === "start" ? "from" : "to";
    const offset = segment.offsets?.[cppEdge];
    if (typeof offset === "number")
        return formatHMS(offset / 1000);
    const timestamp = segment.timestamps?.[cppEdge];
    if (typeof timestamp === "string")
        return formatHMS(parseHMS(timestamp.replace(",", ".")));
    return formatHMS(segment[cppEdge] ?? 0);
}
function parseWhisperOutput(output) {
    const transcription = [];
    const audioTags = [];
    try {
        const parsed = JSON.parse(output);
        const segments = parsed.segments || parsed.transcription || [];
        for (const seg of segments) {
            transcription.push({
                start: whisperTimestamp(seg, "start"),
                end: whisperTimestamp(seg, "end"),
                text: (seg.text || "").trim(),
            });
        }
        if (parsed.audio_tags || parsed.labels) {
            const tags = parsed.audio_tags || parsed.labels || [];
            for (const tag of tags) {
                audioTags.push({
                    start: formatHMS(tag.start ?? 0),
                    end: formatHMS(tag.end ?? 0),
                    tag: tag.tag || tag.label || tag.name || "unknown",
                });
            }
        }
    }
    catch {
        if (output.trim()) {
            transcription.push({ start: "00:00:00", end: "00:00:00", text: output.trim() });
        }
    }
    return {
        backend: "local",
        transcription,
        audio_tags: audioTags,
        full_analysis: null,
    };
}
