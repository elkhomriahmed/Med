# Project: 3D cartoon "hidden-reason" Shorts (competitor-style)

Read these before any creative or pipeline work. They are the source of truth; this file is only the map.

| File | What it rules |
|---|---|
| `production/STYLE_BIBLE.md` | THE style rules. Top section = **v12 LOCKED** (wins over everything below it). Older v2–v11 notes are cumulative history; where they conflict with v12, v12 wins |
| `analysis/STYLE_BREAKDOWN.md` | Measured competitor formula: script beats, hooks, pace, sound mix, captions, shot rhythm, script template + LLM prompt |
| `analysis/reference_tutorial/TUTORIAL_BREAKDOWN.md` | Creator's own guide: word timing first, shot = place, ~3 framings/shot, mute test, 4 rules + 2 mistakes |
| `production/research/*.md` | Mine Salting + Mirror Horse Race breakdowns, v11 audit, v11 scorecard (gaps to fix) |
| `production/videos/01_lighthouse_mercury/` | Video 1: `script.md` (v3 = current), `shotlist.md` |
| `production/look_dev/STYLE_v12_LOCKED_reference.png` | Approved reference frame |
| `production/videos/00_tests/t15_threejs_v12_beams.mp4` | Approved animated look target (three.js, Blender-exported models) |
| `production/kit/CONTRACT.md` | **The production pipeline** (three.js + Remotion): folder owners, character/world APIs, pinned versions, how to render |
| `production/kit/TIMING.md` | Measured frame/render time and predicted time per video with the kit |
| `final_videos/` | **Approved videos** (one folder each: MP4, script, shot list, contact sheets, NOTES.md with what worked + what went wrong). Read the latest NOTES.md before starting a new video |
| `production/visual_library/INDEX.md` | **Visual templates library** (places, props, characters, FX, tools): reuse + vary, never rebuild from zero |
| `production/asset_library/{sfx,music}/INDEX.md` | **The audio library: check it first** (59 effects, 5 music beds). Old `production/library/` is merged into it |
| `analysis/transcripts/`, `analysis/data/` | The 10 competitor Shorts: timed transcripts + per-video measurements |
| `voice-matches/` | ElevenLabs voice-match clips from choosing the house voice (reference only) |

Legacy, keep as reference only (do not build new videos with them): `production/pipeline/` (Blender engine),
`production/look_dev/*.py` and `look_dev/threejs_v12/` (Blender export test), `production/videos/00_tests/*.py`,
`production/bench_threejs/` (speed benchmark). `production/README.md` and `look_dev/README.md` describe the Blender era.

## Kit at a glance (`production/kit/`, run commands from there)
- `shared/assets.js` (INK, SKIN, loaders) · `characters/` (`createCharacter(spec)`, specs KEEPER/ENGINEER, faces in `public/faces`:
  keeper, engineer, folk, folkb × 174 drawings + fx) · `world/` (`buildLampRoom()`, set builders, `createLook()` post chain =
  grade_v12_LOCKED in a shader) · `timeline/` (`Captions.jsx`, `Soundtrack.jsx`, `lipsync.js`, `finish.sh` = −14 LUFS master)
  · `samples/keeper_laughs/` (`direction.js` = word-keyed acting + camera, the template for every new scene).
- Render a still: `npx remotion still <folder>/test/index.js <CompositionId> <folder>/out/x.png --gl=angle` (GPU: Intel Iris Xe).
- Node 26, Remotion 4.0.544, three 0.170.0. 1 unit = 1 m, Y up, 1080×1920, 30 fps, ≤0.5 s/frame budget.

## Voice (decided 2026-11-16)
House voice for every video: ElevenLabs **The Pharaoh 3 – Energetic, Lively & Cheerful**, voice ID `Qziuou6kCJ2R3w53L2Zs`
(in the user's My Voices). The ElevenLabs MCP tools (`mcp__elevenlabs__text_to_speech`, etc.) are connected for voice + SFX.
Then time every word (Whisper) into `[[start, end, word], ...]` JSON before building any scene.

**Sound effects and music — LIBRARY FIRST (user, 2026-11-17; ElevenLabs approved after video 1):**
1. Look in `production/asset_library/sfx/INDEX.md` and `production/asset_library/music/INDEX.md` FIRST and reuse what fits.
2. Only when nothing fits, generate it with ElevenLabs (`text_to_sound_effects`, `compose_music`), then copy the new file into
   `production/asset_library/{sfx,music}/` and add a row to that INDEX.md (category, description, length, source, used in).
3. Voiceovers are NOT saved to the library (never reused).
Reason: protect ElevenLabs credits and Claude usage — video 1 used a lot of both. Keep generations to what's missing.

## Hard rules (never break)
- **Do not edit `*_LOCKED.py` files.** Copy them for new work. Style changes are appended to STYLE_BIBLE as dated notes, never silent replacements.
- **Precedence when notes conflict:** v12 LOCKED > v12 rules > v11 > older. Known resolved conflicts:
  - Faces: flat WHITE (0.97,0.965,0.95), 2D drawing projected from camera, features always centred, gaze via pupils only (not cream, not sliding 3/4 features).
  - Hands: arm line ending in a ~4 cm finger hook (not balls, not mittens). Feet: ~10 cm forward "L" stroke (no boots).
  - Ink: warm dark brown (0.11,0.075,0.06), not navy/black. Open-mouth inside = BLACK (2026-11-15).
  - Head outline: hand-drawn wobbly marker ring (2.2 cm, bites 1–13%), full circle incl. chin line; no collar.
  - Torso: slim capsule (not fat bean), head 0.29 R sits on it.
  - World: NO ink lines on sets; real relief on every surface; built ceilings; no clutter props in lower foreground.
  - Look reference: Cycles still + `grade_v12_LOCKED.py`. Production no longer uses Blender (see Pipeline below).
- **Characters are ONE piece:** all parts move together in the same frame — no lag between parts, no outline change, nothing pops in/out.
- **No limb through the body:** point with the hand nearest the target; if the far hand points, the arm crosses directly in front of the torso — never through, behind, or looping around it.

## Pipeline (2026-11-16, replaces Blender)
- **three.js** (scenes, characters, light) + **Remotion** (timing, captions, composition, render). Target 1–2 h per video.
- Assets: **Poly Haven, ambientCG** (CC0). Voice + SFX: **ElevenLabs**.
- Parallel agents, each in its **own folder**; no agent edits another's files.
  - Framing: head width 18–25% of frame (not close-ups); full bodies in medium/wide.
  - Captions: one word at a time (v11) — white bold rounded sans, black outline, ~70% down.
- **Acting:** calm by default (neutral, half-lid, smirk, side-eye); peaks ≤15% of time, ≤1 s each. Faces change on their exact word.
- **Camera:** one continuous spline per shot, holds ≥1.2 s; flights between places, hard cut only for time jumps; no double-exposure dissolves; nothing within 0.6 m of lens.
- **Light:** visible key source in every scene, characters lit from it; warm pools vs cool shadows/moonlight.
- **Script:** hook = weird deliberate act in first line (strangest picture in first 2 s); "You see," context; mockery w/ quoted line; deadpan hero; time-jump escalation; twist late; mechanism in 1–3 sentences; ironic one-line button; no CTA. ~220–240 words, >60 s, 3.8 words/s, pauses ≤0.34 s. Every line has its own picture; if you can't say what we see, rewrite the line.
- **Sound:** voice from frame 1, ends ≤0.3 s after last word; music bed steady under voice; effect on every action (≥30 distinct per video); story SFX exactly on their word; master −14.0 LUFS.
- **Checks:** low-res stills of every beat before full render; mute test; no flashes; hands visible when the action needs them.
- Max 3–4 characters, each with one signature item visible across the room.

## Kit status (2026-11-16)
`production/kit/` = the code pipeline (see `kit/CONTRACT.md`). Sample `kit/samples/keeper_laughs` approved "for now" by the user.
To fix next: camera still a bit laggy; the circular light/shadow ring on the floor around the pedestal looks wrong (beam bounce off the
mercury pool); some keeper hand moves make the hand look like it disappears.

## Full-video build rules (user, 2026-11-17; also in STYLE_BIBLE)
- The **final voiceover after the speed-up** must be **over 60 s**. Measure the sped-up audio before building any scene.
- Follow the workflow from start to finish, efficiently, but never sacrifice quality to finish early.
- Fix every noted issue in the build: lighting logic, camera movement/tracking, textured 3D backgrounds, character movement,
  expressions, hands, faces, lip-sync, camera moves between places.
- **One connected world:** (almost) all places sit next to each other in the same world; the camera changes place with a fast,
  sped-up flight through it. A normal transition (cut/dissolve) only for a place too far to fly to, a flashback or dream, or a
  complete change of context.

## Keep the user informed while making EVERY video (user, 2026-11-17)
1. **Time per step:** every step gets a target time from `production/kit/TIMING.md`. After each step, tell the user the time it
   took and the estimated time left.
2. **Early warning:** if a step goes past its target, tell the user right away why and how much longer it will take, before
   moving on.
3. **No silent shortcuts:** if the video is running long, let the user choose between more time and a simpler shot. Never lower
   the quality to save time without asking.
4. **Real numbers afterwards:** when the video is done, record the actual time of every step in `production/kit/TIMING.md`, so
   later estimates use measured full videos.

## Deliver only a finished video (user, 2026-11-17)
The MP4 sent to the user must be final: nothing broken, missing, lagging or left "to fix next time". Use the full time to get every
rule in STYLE_BIBLE and this file right. Before sending, check the full-res final render against every rule:
- Voice over 60 s after the speed-up, from frame 1, ending ≤0.3 s after the last word; master −14.0 LUFS.
- Every line has its picture; every place in one connected world with fast flights (normal transitions only where allowed).
- Camera: smooth (no lag or jerk), holds ≥1.2 s, nothing within 0.6 m of the lens, heads 18–25% of frame, no cropped heads.
- Light: visible key source in every scene, characters lit from it, no blown-out lens, no wrong light rings or flashes.
- **Characters never glitch (the #1 problem in every sample so far):** check frame by frame while they talk, gesture and change
  expression: no body part jumping, popping, vanishing or flickering (e.g. the engineer's hand, the keeper's outline), outline
  constant, hands and arms continuous, one piece, no limb through the body, hands visible when the action needs them, faces +
  lip-sync on their words, calm acting with short peaks.
- **Light and shadow logic:** every character casts a shadow that matches the key light and moves with them; objects reflect
  and catch light from the real sources; no floating or misplaced objects: everything sits where it belongs.
- World: textured relief on every surface, built ceilings, no clutter in the lower foreground.
- Sound: ≥30 distinct effects, each accurate to its action and exactly on its word; steady music bed.
- **Captions:** one word at a time, white bold rounded sans with a fairly thick black outline and a small shadow, ~70% down,
  each word bouncing in at the exact moment it's spoken.
- **Short glitches anywhere in the frame (user, 2026-11-17):** nothing may vanish for a few frames, appear from nowhere for a
  few frames, or move/jump without a reason, in the 3D background, props, light/shadows or any character part. Find them on
  purpose: compare every frame with the frames before and after it (a frame that differs from both neighbours while they
  agree = a 1–3 frame pop), flag those frames plus sudden jumps in camera/object motion, then look at each flagged frame
  and fix the cause (don't just hide it). Repeat on the final render.
- Mute test passes. Watch the whole video once at full speed like a viewer.
Fix anything that fails, render again, and check again. Only then send. If something truly cannot be fixed, say so before
sending; never hand over a video with a known problem as if it were finished.

## Templates, final videos, lessons (user, 2026-11-17)
- **Not a series:** each video has its own story, places and characters. But start from `production/visual_library/INDEX.md`:
  pick the closest template (e.g. HARBOUR_TOWN for any town by the sea, SCHOONER for a ship, LIGHT_BEAMS for any beam) and vary
  its surroundings, dressing, colours, signs and time of day. Add every new builder to that index after the video.
  Templates marked **⚠ UPGRADE BEFORE REUSE** (not textured / 3D enough yet) must be upgraded in place the first time a video
  uses them; the better version replaces the old one and its status becomes ✅ (with the date). Never ship a ⚠ template as-is.
- **Agents (user, 2026-11-17):** agents cost Claude usage but keep the work organised and glitch-free, so keep using them. Choose
  the number per video by need (2, 4, 5…: one per independent place/character set/system); never cut the count if it would hurt
  the video. Keep them efficient: tight self-contained briefs, each in its own folder, a time target, short reports, no
  duplicate work, and reuse templates so agents upgrade/vary instead of building from zero.
- **Final videos:** when the user approves a video, move it to `final_videos/<NN_title>/` with script, shot list, contact sheets
  and `NOTES.md` (what worked / what went wrong). Delete the duplicate render copies in `kit/videos/vNN/out/`.
- **Lessons from video 1 (approved at 7/10; do NOT repeat):** read `final_videos/01_why_lighthouse_keepers_went_mad/NOTES.md`.
  In short: every transition designed (no raw cuts on context changes; flights never abrupt or empty); sound effects accurate to
  the picture; quoted character lines in the character's own voice/tone; calm, natural narration (no exaggerated parts);
  one harmonious palette per place; truly 3D, highly textured backgrounds (see below); frame camera by distance in small rooms.
- **3D depth and texture (user, 2026-11-17):** the world behind the characters must read as fully 3D and highly textured, not flat
  (video 1's town especially). Every place needs: real geometry relief (bricks, beams, window frames, sills, cornices, roof tiles,
  cobbles with height, not just normal maps on flat walls), many layers of depth (near props, mid set, far set, distant
  silhouettes), parallax visible during camera moves, varied materials and wear, contact shadows/AO in every corner, and enough
  small detail that a still frame looks rich. Check stills of each place against the look reference before building shots.
- **Save tokens and credits:** library first for sound, music and visuals; reuse templates; fewer, smarter check renders (contact
  sheets + `tools/popscan.py`), and fix whole categories of problems per round instead of one shot at a time.

## Project check (2026-11-17): things to know
- **Video 1 is finished** (2026-11-17): `production/videos/01_lighthouse_mercury/lighthouse_mercury_v12_final.mp4`, script v4
  (`script_v4_text.txt`, 242 words), voice `kit/public/audio/vo_v4.wav` (63.9 s), direction in `kit/videos/v01/` = the template
  for the next videos (world assembly, word-keyed acting, camera with flights, props in hands, gag overlays, sound plan + pre-mix).
- **Git (user, 2026-11-17):** this folder IS the git checkout of https://github.com/elkhomriahmed/Med, branch
  `claude/shorts-competitor-analysis-59gfay` (the repo's default). The work stays on this laptop; push updates to that branch
  (commit + `git push`) whenever work is saved, e.g. after a video is approved or rules/libraries change. Never commit files over
  100 MB (final MP4s stay in `final_videos/`, ignored) or `node_modules/`; check `git status` before each commit.
- Music: only `cartoon_funny_quirky_5min.mp3` is cleared for use; check the licence of `everything_in_its_right_place.mp3` first.
- Built places in code: lamp room (`world/lampRoom.js`), lighthouse exterior + sea + sky + jetty + ships (`world/exterior/`),
  harbour town (`world/town/`). Cast: 9 characters in `characters/specs.js`. Tools: `kit/tools/popscan.py` (glitch scan),
  `kit/tools/sheet.py` (contact sheets), `kit/tools/mix_fx.py` (sound pre-mix).

## Open notes (not blocking)
Ceiling too dominant/orange; keeper beard edge zig-zag; engineer finger hook thin on check coat; more set texture variety; render cost ~240 s/frame on Cycles CPU (full video ~125 h) — speed is an open problem.
