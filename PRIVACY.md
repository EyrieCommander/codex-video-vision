# Privacy

`codex-video-vision` processes local video files so Codex can inspect them. The MCP server reads the video path you provide, extracts temporary frames and audio with `ffmpeg`, and returns selected frames, metadata, analysis, and transcript segments to the Codex session.

Local processing:

- Frame extraction happens locally with `ffmpeg`.
- Local Whisper processing happens on your machine.
- Temporary extraction directories are removed after each request unless session indexing is enabled.
- When `enable_index` is enabled, cached frame manifests live under `~/.codex-video-vision/sessions/`.

Cloud processing:

- Gemini API sends extracted audio to Google's Gemini API when `backend` is `gemini-api`.
- OpenAI Whisper sends extracted audio to OpenAI when `backend` is `openai`.
- Video frames are still extracted locally; only the selected MCP result content is sent to the Codex session.

Persistent local files:

- `~/.codex-video-vision/config.json`
- `~/.codex-video-vision/models/`
- `~/.codex-video-vision/sessions/`

Do not use a cloud audio backend for private, regulated, or proprietary videos unless you are allowed to send extracted audio to that provider.
