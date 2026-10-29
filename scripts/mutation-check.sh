#!/bin/sh
# Run from any directory. Requires the repo's existing Node/npm, dependencies,
# and ffmpeg/ffprobe test prerequisites; never installs or downloads anything.
# All mutations run in a disposable copy of the CURRENT tree (including edits).
# No git operations, source patching, stashing, or copying of .env/config files.
set -eu

usage() {
  echo "Usage: $0 [--self-test]"
  echo "Normal: baseline must pass and all seven mutants must fail (exit 0)."
  echo "--self-test or MUTATION_SELFTEST=1: break the copied baseline (exit 1)."
}
selftest=${MUTATION_SELFTEST:-0}
case ${1:-} in
  --self-test) selftest=1 ;;
  --help|-h) usage; exit 0 ;;
  '') ;;
  *) usage >&2; exit 2 ;;
esac
[ "$#" -le 1 ] || { usage >&2; exit 2; }
case $selftest in 0|1) ;; *) echo "MUTATION_SELFTEST must be 0 or 1" >&2; exit 2 ;; esac
script_dir=$(CDPATH= cd "$(dirname "$0")" && pwd)
root=$(CDPATH= cd "$script_dir/.." && pwd)
[ -d "$root/mcp-server/node_modules" ] || {
  echo "Missing mcp-server/node_modules; install the repo's dependencies first." >&2
  exit 2
}
# Keep even the test temp files and synthetic home inside this checkout.
sandbox=$(mktemp -d "$root/.mutation-check.XXXXXX")
cleanup() { rm -rf "$sandbox"; }
trap cleanup 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

node - "$root/mcp-server" "$sandbox" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [source, sandbox] = process.argv.slice(2);
const project = path.join(sandbox, 'mcp-server');
fs.mkdirSync(project);
// Explicit allowlist: never copy a working-directory .env or user config.
for (const name of ['src', 'tests', 'package.json', 'tsconfig.json',
  'vitest.config.ts', 'vitest.config.js', 'vitest.config.mts', 'vitest.config.mjs',
  'vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs']) {
  const from = path.join(source, name);
  if (fs.existsSync(from)) fs.cpSync(from, path.join(project, name), { recursive: true });
}
fs.cpSync(path.join(project, 'src'), path.join(sandbox, 'baseline-src'), { recursive: true });
fs.symlinkSync(path.join(source, 'node_modules'), path.join(project, 'node_modules'), 'dir');
fs.mkdirSync(path.join(sandbox, 'tmp'));
fs.mkdirSync(path.join(sandbox, 'home'));
NODE

mutate() {
  node - "$sandbox" "$1" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [sandbox, id] = process.argv.slice(2);
const src = path.join(sandbox, 'mcp-server/src');
fs.rmSync(src, { recursive: true, force: true });
fs.cpSync(path.join(sandbox, 'baseline-src'), src, { recursive: true });
const mutations = {
  'auto-fps': ['extractors/frames.ts',
    'if (durationSeconds < 60) return 2;', 'if (durationSeconds < 60) return 0;'],
  'model-integrity': ['backends/local.ts',
    'if (hash.digest("hex") !== expectedSha)', 'if (false)'],
  'session-tail': ['session/manager.ts',
    'hash.update(buffer.subarray(0, bytesRead));', 'hash.update(buffer.subarray(0, bytesRead)); break;'],
  'watch-cleanup': ['tools/video-watch.ts',
    'rmSync(workDir, { recursive: true, force: true });', 'void workDir;'],
  'gemini-cleanup': ['backends/gemini-api.ts',
    'if (uploaded.name) await ai.files.delete({ name: uploaded.name }).catch(() => {});', 'void uploaded;'],
  'segment-budget': ['extractors/frames.ts',
    'maxFrames: maxFrames - allFrames.length,', 'maxFrames: 1000,'],
  'crop-duration': ['extractors/frames.ts',
    'args.push("-t", String(duration));', 'args.push("-t", String(parseHMS(endTime!)));'],
};
const mutation = mutations[id];
if (!mutation) throw new Error(`Unknown mutation: ${id}`);
const [relative, before, after] = mutation;
const file = path.join(src, relative);
const text = fs.readFileSync(file, 'utf8');
if (text.split(before).length !== 2) {
  throw new Error(`Mutation ${id}: expected exactly one matching source fragment; update the check`);
}
fs.writeFileSync(file, text.replace(before, after));
NODE
}

run_tests() {
  (cd "$sandbox/mcp-server" && HOME="$sandbox/home" TMPDIR="$sandbox/tmp" \
    NPM_CONFIG_UPDATE_NOTIFIER=false npm test -- --maxWorkers=1) > "$sandbox/test.log" 2>&1
}

if [ "$selftest" = 1 ]; then
  echo "SELFTEST: injecting auto-fps break into the copied baseline"
  mutate auto-fps
fi
if run_tests; then
  if [ "$selftest" = 1 ]; then
    echo "FAIL: the known broken baseline unexpectedly passed" >&2
    cat "$sandbox/test.log"
    exit 1
  fi
  echo "PASS: unmutated baseline"
else
  cat "$sandbox/test.log"
  echo "FAIL: baseline tests failed; mutation check cannot pass" >&2
  exit 1
fi

survivors=0
for id in auto-fps model-integrity session-tail watch-cleanup gemini-cleanup segment-budget crop-duration; do
  mutate "$id"
  if run_tests; then
    echo "SURVIVED: $id" >&2
    cat "$sandbox/test.log"
    survivors=$((survivors + 1))
  else
    echo "KILLED: $id"
  fi
done

# Also verify the test environment still works after all mutant runs.
node - "$sandbox" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const sandbox = process.argv[2];
const src = path.join(sandbox, 'mcp-server/src');
fs.rmSync(src, { recursive: true, force: true });
fs.cpSync(path.join(sandbox, 'baseline-src'), src, { recursive: true });
NODE
if ! run_tests; then
  cat "$sandbox/test.log"
  echo "FAIL: restored baseline tests failed" >&2
  exit 1
fi
[ "$survivors" -eq 0 ] || { echo "FAIL: $survivors mutation(s) survived" >&2; exit 1; }
echo "PASS: all 7 mutations killed; restored baseline passed; source tree untouched"
