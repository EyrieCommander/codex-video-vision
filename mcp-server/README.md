# Codex Video Vision MCP Server

This package provides the MCP server used by the Codex Video Vision plugin. It extracts video metadata, timestamped frames, ffmpeg analysis, and optional audio transcripts so Codex can inspect local video files.

## Usage

After installation, start the server with:

```bash
codex-video-vision
```

The Codex plugin's MCP config can point to a published package with:

```json
{
  "codex-video-vision": {
    "command": "npx",
    "args": ["-y", "codex-video-vision@latest"]
  }
}
```

For local development, run:

```bash
npm install
npm run build
npm test
```

## Requirements

- Node.js 20+
- `ffmpeg` and `ffprobe`
- Optional audio backend: Gemini API, local Whisper, or OpenAI Whisper API

## License

MIT. This is a Codex-oriented port of Jordan Vasconcelos's MIT-licensed `claude-video-vision`.
