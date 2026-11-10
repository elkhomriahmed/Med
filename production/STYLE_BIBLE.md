# Style bible (locked)

These are the rules for every video in this project. Change them only on purpose, and record the change here.

## 1. Characters
- **Body:** 3D. Big white sphere head (radius ~0.29 m, a little wider than the body), a bean-shaped torso, thin dark stick arms and legs, small round hands, small oval shoes.
- **Surface:** soft shading with real cast shadows. Heads stay near-white under any light (slight self-glow).
- **Outline:** thick dark silhouette line, plus **inner lines** wherever two parts meet: hat cuff on the forehead, hairline, beard edge, tie edge.
- **Face:** drawn flat and always facing the camera, even when the body is turned. Features are painted with tapered brush strokes:
  - eyes: small ovals, or heavy upper lids for smug/bored looks
  - brows: thick and tapered
  - mouth: small, with teeth or a dark red inside when open
- **Expressions (14):** neutral, smug, happy, laugh, shock, scream, angry, furious, worried, skeptical, sleepy, evil, proud, talk. Swap the expression on the exact word it reacts to.
- **Hair and knitwear:** drawn strand or rib lines in a darker tone.
- **Beards, moustaches, ties:** drawn flat on the face or shirt with an ink outline, not sculpted.
- **Status:** the design is **locked** (approved). The final sign-off on expressions, lip sync and movement comes after the first video.
- **Identity:** one signature item per character, readable from across the room (a hat, a colour or a prop). Use 3–4 characters per video at most.
- **Poses:** rest, hips, explain, point, shrug, panic, wave, hold, thinking. Arms come out of the side of the torso, bend gently, and keep the hands near the body unless pointing or panicking.

## 2. Places
- **Real 3D sets** built piece by piece: every board, beam, brick and prop is its own object.
- **Rounded, toy-like edges** on everything (bevelled), the same softness as the character torsos. No razor-sharp boxes.
- **Ink lines** on the set's edges, thinner than the character outlines.
- **Dressed with props** that tell the story: signs, labels, clocks, lamps, tools.
- **Real surface texture, not flat colour:**
  - wood: thin wavy grain lines, knots, a different tone per board
  - painted walls: brush texture and grime toward the floor
  - fabric: a weave
- That texture also bumps the lighting, and contact shadows (ambient occlusion) darken corners and the spots under furniture. Together these make places read as real 3D, not just colour plus outlines.

## 3. Colour and light
- **Calm, not neon.** Saturation is never pushed. Pair one warm and one cool family per location, e.g. warm wood with sage/teal walls, or blue night with warm lamps.
- **Light tells the story:** day for setup, blue-violet night for scheming or danger, a warm candle or lamp for flashbacks, golden sunrise for the resolution.
- **Visible light sources:** lamps, windows, a stove glow. A sun patch on the floor through the window frame.
- **Soft bloom** on bright sources only.

## 4. Camera
- **Even "normal" shots are close-ups:** waist-up or tighter, with the background softly blurred.
- **Shot = place.** Hard cut or dissolve only when the story moves to a new location.
- **Inside a place, the camera never sits still.** It glides quickly from one point of focus to the next, about every 2 s on a new line. Example: from someone sawing a rail, straight down the same track to its unfinished end.
- **Dive into objects** to change scene without a cut: push into a box on the desk, a model, a window or a picture, and come out inside that place. Example: the guard at the desk, then into the small pink box on the desk, then inside the pink cell.
- **Wide establishing shots** only to set a new place, then straight back to close framing.
- **Big places to explore:** each location is built big enough to hold several points of interest, so the camera can travel between them as the narration moves on.

## 4b. Transitions and their sounds
- **New place or new scene:** a camera-shutter (click) sound on a quick cut or flash.
- **Same place, new focus:** a whoosh on a fast camera move.
- **Dive into an object:** a whoosh while pushing in, then the new place opens up.

## 5. Captions, audio, timing
- **Captions:** 1–3 words, white bold rounded sans with a thin black outline and small shadow, centred at about 70% height.
- **Voice:** starts on frame 1. The video ends about 0.3 s after the last word.
- **Music bed:** about −27 dB under the voice. Sound effects land exactly on their words. Master to −14 LUFS.

## 6. Render pipeline (fast)
`production/pipeline/`
1. Build the set and characters in Blender (`sets/*.py`, `characters.py`).
2. **Bake once per location:** the set's colour, lighting (sun, lamps, bounce) and ink lines go into one texture atlas, about 25 s.
3. **Bake once per shot:** the characters into their own atlas, about 45 s. Face layers stay live so expressions swap per word.
4. **Render frames** with Blender's fast Workbench renderer at 1080×1920: about **1.3 s per frame** without blur.
5. Glow pass and captions in post, then mux with the audio.

**Still open:**
- Background blur through Workbench roughly triples frame time (about 3–5 s per frame). The plan is a cheap depth-based blur in post instead, to stay inside the time limit.
- **Frame rate: 30 fps (decided).** That's about 47 min to render a 60 s video.

## Locked assets
- `pipeline/faces.py`: expression set (`renders/v4_faces.jpg`)
- `pipeline/characters.py`: keeper (red knit beanie, white beard, yellow raincoat) and engineer (bowl-cut hair, round glasses, striped blue tie)
- `pipeline/sets/cottage.py`: keeper's cottage
- Reference frame: `look_dev/renders/v4_frame.png`
