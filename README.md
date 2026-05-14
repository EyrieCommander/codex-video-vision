# Codex Video Vision

Give Codex a local video perception layer.

This Codex plugin extracts timestamped frames with `ffmpeg`, analyzes video structure with `ffmpeg` filters, and transcribes audio through Gemini API, local Whisper, or OpenAI Whisper. Codex receives a compact packet of metadata, frame images, scene/silence analysis, and timestamped transcript segments.

This project is a Codex-oriented port of Jordan Vasconcelos's MIT-licensed [`claude-video-vision`](https://github.com/jordanrendric/claude-video-vision). The original copyright and license are preserved in `LICENSE`.

## What It Does

- `video_info`: reads duration, resolution, codec, frame rate, file size, and audio presence.
- `video_analyze`: detects scene changes, black intervals, silence, freeze, motion profile, blur, exposure, loudness, and optional transcription.
- `video_watch`: extracts frames and audio/transcript for an initial pass.
- `video_detail`: drills into specific timestamp windows at higher resolution or FPS.
- `video_configure`: saves backend and extraction preferences.
- `video_setup`: checks dependencies and suggests install steps.

The plugin is a perception layer. The agent still does the interpretation: summarizing a video, comparing it to a storyboard, identifying missing beats, or producing a review packet.

The plugin includes two Codex skills:

- `video-perception`: general video inspection workflow.
- `storyboard-review`: compares a render against a storyboard, script, shot list, or production brief.

## Requirements

- Node.js 20+
- `ffmpeg` and `ffprobe`
- Optional audio backend:
  - Gemini API with `GEMINI_API_KEY`
  - local Whisper via `whisper.cpp` or Python `openai-whisper`
  - OpenAI Whisper API with `OPENAI_API_KEY`

## Local Development

Build the MCP server:

```bash
cd mcp-server
npm install
npm run build
npm test
npm run smoke:mcp
```

The plugin manifest lives at `.codex-plugin/plugin.json`. The local MCP config in `.mcp.json` starts the built server with:

```json
{
  "codex-video-vision": {
    "command": "node",
    "args": ["./mcp-server/dist/index.js"]
  }
}
```

Configuration is stored under:

```text
~/.codex-video-vision/config.json
~/.codex-video-vision/.env
~/.codex-video-vision/models/
~/.codex-video-vision/sessions/
```

API keys can come from the process environment or from a gitignored `.env` file. The server loads `OPENAI_API_KEY` and `GEMINI_API_KEY` from the shell environment first, then from `.env` in the current working directory, then from `~/.codex-video-vision/.env`.

Example user-level key file:

```bash
mkdir -p ~/.codex-video-vision
printf 'OPENAI_API_KEY=sk-...\n' > ~/.codex-video-vision/.env
chmod 600 ~/.codex-video-vision/.env
```

## Recommended Agent Workflow

1. Start with `video_info`.
2. For videos longer than 30 seconds, run `video_analyze` before extracting frames.
3. Use the transcript, scene changes, and silence intervals to choose frame segments.
4. Run `video_watch` for an overview.
5. Use `video_detail` for close inspection around key moments.
6. Avoid re-extracting cached frames when `enable_index` is on.

## Witness / Storyboard Review Use Case

For educational video production, the useful Codex task is often not "summarize this video" but "compare this render against the intended script." A good review packet should include:

- Source video path and duration.
- Storyboard path and intended coverage.
- Scenes or shots visibly covered.
- Missing or weak story beats.
- Transcript/caption status.
- Visual consistency issues.
- App integration status.
- Recommendation: accept, revise, extend, or regenerate.

## Publishing Notes

The repository metadata points to `https://github.com/EyrieCommander/codex-video-vision`. Before a release, run `npm run build`, `npm test`, `npm run smoke:mcp`, and `npm pack --dry-run` from `mcp-server`. If publishing to npm later, switch `.mcp.json` from local `node ./mcp-server/dist/index.js` to the published package command.

## License

MIT. Based on [`claude-video-vision`](https://github.com/jordanrendric/claude-video-vision) by Jordan Vasconcelos.
