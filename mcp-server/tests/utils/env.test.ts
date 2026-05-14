import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { loadEnvFile, loadEnvFiles, parseEnvFile } from "../../src/utils/env.js";

const TEST_DIR = join(tmpdir(), "cvv-env-test-" + Date.now());

describe("env file loading", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    delete process.env.CVV_TEST_KEY;
    delete process.env.CVV_TEST_OTHER;
  });

  afterEach(() => {
    delete process.env.CVV_TEST_KEY;
    delete process.env.CVV_TEST_OTHER;
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("parses common .env syntax", () => {
    const parsed = parseEnvFile(`
# comment
CVV_TEST_KEY="one two"
export CVV_TEST_OTHER='three'
IGNORED-HYPHEN=value
BARE=value # comment
`);

    expect(parsed.CVV_TEST_KEY).toBe("one two");
    expect(parsed.CVV_TEST_OTHER).toBe("three");
    expect(parsed.BARE).toBe("value");
    expect(parsed["IGNORED-HYPHEN"]).toBeUndefined();
  });

  it("loads values without overriding process env", () => {
    const envPath = join(TEST_DIR, ".env");
    process.env.CVV_TEST_KEY = "already-set";
    writeFileSync(envPath, "CVV_TEST_KEY=from-file\nCVV_TEST_OTHER=loaded\n");

    const loaded = loadEnvFile(envPath);

    expect(process.env.CVV_TEST_KEY).toBe("already-set");
    expect(process.env.CVV_TEST_OTHER).toBe("loaded");
    expect(loaded).toEqual(["CVV_TEST_OTHER"]);
  });

  it("loads multiple files in order", () => {
    const first = join(TEST_DIR, ".env.first");
    const second = join(TEST_DIR, ".env.second");
    writeFileSync(first, "CVV_TEST_KEY=first\n");
    writeFileSync(second, "CVV_TEST_KEY=second\nCVV_TEST_OTHER=second\n");

    const loaded = loadEnvFiles([first, second]);

    expect(process.env.CVV_TEST_KEY).toBe("first");
    expect(process.env.CVV_TEST_OTHER).toBe("second");
    expect(loaded).toEqual(["CVV_TEST_KEY", "CVV_TEST_OTHER"]);
  });
});
