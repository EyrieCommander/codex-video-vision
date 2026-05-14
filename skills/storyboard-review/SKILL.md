---
name: storyboard-review
description: Use when comparing a video render against a storyboard, script, shot list, narration plan, caption file, or production brief.
---

# Storyboard Review

Use this skill after `video-perception` when the task is not only to summarize a video, but to judge whether a render matches an intended creative or instructional plan.

## Inputs To Gather

- Video file path.
- Storyboard, script, shot list, or production brief path.
- Any known target runtime, required scenes, required lines, required visual references, and caption/transcript expectations.
- User's decision need: accept, extend, revise, regenerate, or create a production packet.

## Workflow

1. Read the storyboard or brief first. Extract the intended structure:
   - title and target runtime;
   - scene or shot list;
   - required story beats;
   - required dialogue or narration;
   - required visual details;
   - pause points, end cards, captions, or app-integration requirements.

2. Use `video_info` on the video.

3. For videos longer than 30 seconds, use `video_analyze` with at least:
   - `scene_changes: true`
   - `silence: true`
   - `transcription: true` when the video has audio

4. Use `video_watch` for initial coverage. Use segments rather than full high-FPS extraction for longer videos.

5. Use `video_detail` only around candidate mismatches:
   - scene boundaries;
   - storyboard beats that appear missing;
   - text or caption moments;
   - fast motion or visual artifacts;
   - opening, pause point, and ending.

6. Compare the render to the plan. Keep the review practical, not exhaustive.

## Review Packet Format

Prefer this concise structure:

- **Verdict:** accept, accept with caveats, revise, extend, regenerate, or insufficient evidence.
- **Coverage:** which scenes/shots/beats are present.
- **Missing/Weak Beats:** what the storyboard requires but the video does not clearly deliver.
- **Transcript/Captions:** transcript status, obvious missing captions, or lines that diverge from script.
- **Visual QA:** artifacts, character drift, unreadable text, pacing, or continuity issues.
- **Integration Notes:** file path, duration, media status, and whether it is ready for app/demo use.
- **Next Action:** the smallest useful production move.

## Judgment Rules

- Do not require exact shot-for-shot matching unless the user asks for that.
- For prototype/demo work, prioritize whether the render carries the intended learning or narrative beat.
- If the video is a partial clip rather than a full episode, say that plainly and judge it against the covered portion only.
- If captions or transcript are missing, separate that from visual acceptability.
- If the storyboard is outdated or conflicts with the app/curriculum state, surface the conflict before recommending more generation.
