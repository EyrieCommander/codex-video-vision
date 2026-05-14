# Contributing

This project is a Codex-oriented port of `claude-video-vision`.

## Development

```bash
cd mcp-server
npm install
npm test
npm run build
npm run smoke:mcp
```

Keep changes small and testable. The MCP server should remain a perception layer: gather metadata, frames, analysis, and transcript data without trying to make product-specific judgments inside the tool.

## Porting Notes

- Preserve the MIT license and original copyright notice.
- Keep Codex-specific instructions in `skills/video-perception/SKILL.md`.
- Keep local configuration under `~/.codex-video-vision/`.
- Avoid introducing shell command construction from untrusted video paths. Prefer `execFile` with argument arrays.

## Before Publishing

- Confirm repository metadata still points to `https://github.com/EyrieCommander/codex-video-vision`.
- Decide whether the public install path should be GitHub-local build or npm-backed `npx`.
- Run `npm run build`, `npm test`, `npm run smoke:mcp`, and `npm pack --dry-run` from `mcp-server/`.
