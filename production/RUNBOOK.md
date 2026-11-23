# RUNBOOK: making a video, start to finish (user, 2026-11-23)

One ordered checklist that pulls EVERY project note together. Follow it top to bottom for every video; do not skip a gate.
Goal: a finished video in the least time and the least Claude/ElevenLabs usage. Most wasted usage so far came from things the
user had to point out AFTER a render (story, character shapes, transitions, colours, props popping). Each gate below exists to
catch one of those BEFORE anything expensive is built.

## 0. Read first (once per video, ~5 min)
`CLAUDE.md` (hard rules) → `production/STYLE_BIBLE.md` (v12 LOCKED top, then the dated sections, newest = "2026-11-23") →
`analysis/astronauts_flush/ANALYSIS.md` (story/transitions/colour benchmark) → `production/visual_library/CHARACTER_LOCK.md` +
`CHARACTERS_LOCKED_reference.jpg` → the latest `final_videos/*/NOTES.md` → `kit/TIMING.md` (targets for every step below).
Tell the user the plan with a target time per step (rule: report time used/left after each step, warn early, never cut quality
silently).

## 1. Idea + script → GATE A (user approval before ANY voice credit is spent)
- Format: a real story told stake-first, or **"If you…" / what-if** in second person (`STYLE_BREAKDOWN.md` §8 template).
- Story gate (STYLE_BIBLE 2026-11-23 A): hook promises a stake only the last line pays; one protagonist, one place cluster, one
  question, no lecture/expert tangent; cause-and-effect chain with a mystery picture, escalation, the viewer's question aloud
  mid-video, mechanism in 2–3 picture steps; every setup paid off; ending = the real outcome.
- Script file lists: each line + "what we see"; setups → payoffs; places (and which are glide vs cut); cast (face set, clothes,
  signature item); the video's colour scheme (base + accent family).
- 200–240 words; the sped-up voice must be > 60 s.
- **Show the script to the user and wait for approval.** (Cheapest moment to change the story.)

## 2. Voice + timing (~5–10 min)
House voice The Pharaoh 3 (`Qziuou6kCJ2R3w53L2Zs`). Quoted lines in the character's own tone; narration calm, never exaggerated.
`tools/vo_build.py` (join parts, opening pauses ≤ 0.14 s, tempo) → measure > 60 s → `tools/words.py` (Whisper word timing).
Voiceovers are not saved to the library.

## 3. Look board → GATE B (one low-res still per place + one per character, ONE message to the user)
- Places: start from `visual_library/INDEX.md` templates (upgrade any ⚠ template in place); one connected world but built inside
  the ONE colour scheme; 3D relief + texture + depth layers + contact shadows; visible key light. Check `tools/palette_check.py`
  on the stills (base family ≳ 60% of saturated px, strong saturation ≳ 30%, darks 35–55%, no muddy brown/orange midtones).
- Characters: specs only (`CHARACTER_LOCK.md`): different face sets, no beards unless needed, clothes in the scheme, protagonist
  brightest; compare with `CHARACTERS_LOCKED_reference.jpg`.
- Send the board once; fix what the user flags in one round. Do not start direction before this passes.

## 4. Agents (only for independent heavy pieces; a brief that is missing any line below is not sent)
Use agents for new/upgraded places, new prop families, new face identities: one agent per independent piece, each in its own
folder (kit/CONTRACT.md owners), in parallel. Never for direction, script, or small fixes (do those directly: cheaper).
**Brief template (copy):**
```
Goal + done-when: <one sentence; what files exist and what the still must show>
Folder you own: <path>; do not edit any other folder.
Read: CLAUDE.md "Hard rules", STYLE_BIBLE "v12 LOCKED" + "2026-11-23", <CHARACTER_LOCK.md if any person/face is involved>,
      visual_library/INDEX.md row <template to start from>.
Colour scheme of this video: base <family/hexes>, accent <family/hexes>.
Constraints: <dimensions/anchors/API the integrator needs, units m, Y up, floor y>.
Check before reporting: one low-res still at <view>, palette_check numbers, no z-fighting/coplanar faces with neighbours.
Time target: <min>. Report in ≤ 10 lines: files, anchors/API, the still path, anything not done.
```
Resume a stopped agent with SendMessage (same context) instead of starting a new one.

## 5. Direction (word-keyed acting + camera), template `kit/videos/v02/`
- Every line has its picture; faces change on their word; calm acting, peaks ≤ 15% and ≤ 1 s; `lookAt` on everyone every beat.
- Camera: glide only within a place (≲ 10 m, in view); every farther change = a designed cut (match cut on a shared picture,
  sound bridge, whip, swipe, flash, push into a screen/page) ≤ 0.3 s; holds ≥ 1.2 s; new framing every ~0.7–1.5 s in long
  one-character scenes; nothing within 0.6 m of the lens; heads 18–25% (no cropped heads); push-ins arc around obstacles, end upright.
- First 15 s: camera never rests, a new picture every ~1.5–2 s, no raw cuts, no pauses, an accent sound on every beat.
- Props: picked up and put down by a hand (blendFrom), never pop; rest ON surfaces; device in frame when used; held paper ≥ 10 cm
  in front of the face; seated people framed 3/4.
- Story-critical picture readable in one still (e.g. the white selfie face).
- No coplanar surfaces between builders (offset ≥ 2–3 cm).

## 6. Sound plan (library first)
`asset_library/sfx` + `music` INDEX first; generate with ElevenLabs only what is missing, save it to the library + INDEX row the
same day. ≥ 30 distinct effects, each accurate to its action and on its word; an accent on EVERY transition (shutter, whoosh,
swipe, crackle); steady music bed (cleared tracks only). `tools/mix_fx.py`.
**Sound editing rules (STYLE_BIBLE 2026-11-23):** every effect gets a length (cut to its moment, never played raw to the end), sits
on a VISIBLE action at that exact frame (check against the direction, not just the words), booms stay under the voice, and the
music is measured per second first and built from its loud parts (`pieces`) so it plays from frame 1. Sound-only fixes: re-mix +
mux onto the existing render, no re-render.

## 7. Checks → GATE C (all on ONE low-res render of the whole video, ~5 min; never chains of single stills)
- `tools/sheet.py` contact sheets of every shot, `tools/popscan.py` (1–3 frame pops), `tools/transition_check.py` (sound on every
  change), `tools/palette_check.py` (scheme), opening 15 s energy, mute test.
- Fix whole CATEGORIES per round (all framing, then all props, …), then re-check only the changed ranges (`--frames=a-b`).
- Side views for geometry doubts: `--props='{"dbgCam":{...}}'` (v02 Video.jsx pattern).

## 8. Final render + master + delivery
Full render (~7 min) → `timeline/finish.sh` (−14.0 LUFS) → popscan + transition_check on the final → watch once at full speed →
the "Deliver only a finished video" checklist in CLAUDE.md. Then: copy to Downloads + `production/videos/<NN>/`, send it in chat
(SendUserFile), commit + push code (never MP4s > 100 MB or node_modules), report ElevenLabs characters used (voice / SFX / music).

## 9. After approval
`final_videos/<NN>/` (MP4, script, shot list, contact sheets, NOTES.md: what worked / what went wrong) → log real step times in
`kit/TIMING.md` → add new builders/props/faces/SFX to the libraries → append new lessons to STYLE_BIBLE (dated) → push.

## Usage savers (always)
- Gates A and B catch story and look problems before direction and renders (video 2 lost hours to post-render story/character fixes).
- One low-res full render per check round; single stills only for one specific doubt (each still rebuilds the world, ~60 s).
- Reuse templates, specs, faces, SFX, the v02 direction/Video.jsx patterns; never rebuild what exists.
- Small edits directly with Edit/python patches; agents only for big independent builds.
- Keep messages to the user short: what changed, what is next, time used/left.
