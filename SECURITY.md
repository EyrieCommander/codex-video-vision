# Security

Report security issues privately through the repository's GitHub Security Advisory flow once the public repository exists.

Security-sensitive areas:

- Local video path validation.
- Shell/process execution around `ffmpeg`, `ffprobe`, `whisper`, and `curl`.
- Whisper model download and checksum verification.
- Temporary file cleanup.
- Session-cache access under `~/.codex-video-vision/sessions/`.
- Cloud audio backend boundaries.

Do not include private videos, API keys, or proprietary transcripts in public issues.
