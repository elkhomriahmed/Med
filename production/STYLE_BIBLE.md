# Style bible (locked)

**Approved reference frame: `look_dev/renders/v10_window_light.png`.** Every location follows its logic:
- one real light source in the scene (window, lamp, bulb, sun) that actually lights the room and the characters
- the light comes from that source's side, not from the camera
- motivated lights only: lamps are off in daylight
- no ink lines on the set
- two colour families: cool walls against warm wood
- solid geometry with no gaps showing the sky
- soft glow on the source

Colour and 3D detail will keep improving over time.

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

---

# Production formula (locked from the approved 5-second sample, v11)

Every video follows these rules.

## Look
- **Characters:** 3D white ball heads with drawn faces that always turn to the camera. Bean bodies and thin ink arms and legs.
- **Outlines:** a thick black ink outline around the whole character (head, body, hat, clothes). The world has **no** outlines.
- **3D world:** real modelled sets with textured wood, paint and fabric, rounded edges, and contact shadows in corners. Each set is built big enough to hold several points of interest.
- **Colour:** two colour families per place (cool walls or sky against warm wood), with clean, not muddy, saturation. A soft glow on light sources.
- **Light follows real-world logic:** there is always one visible source (a window, lamp or lens). Lamps are off in daylight. Characters are lit from the source's side.

## Acting
- **Faces change all the time:** the expression switches on the exact word it reacts to, sometimes a few frames before an action, never on the same frame as a big camera move.
- **Bodies are always alive:** constant bob and sway, squash and stretch on keywords, and arm gestures (point, panic, shrug, hold).
- **Props sit in the drawn hand,** using where the hand actually renders, not its stored position.
- **Quoted dialogue:** the speaking character's mouth flaps between open and closed, and the face expression carries the emotion.
- **Real physics:** thrown or dropped things follow gravity, tumble, bounce and settle. Liquids pour and pool, spinning things spin with weight.

## Camera
- **Few places, long shots.** Each place is one continuous shot. The camera glides between points of interest inside it (a character, a prop, the window, another character) instead of cutting.
- **Hard transitions only between places:** a quick flash with a camera-shutter click. Moves within a place get a whoosh.
- **Opening:** a fast push in from wide, straight onto the main character.
- **The camera never stops:** a slow drift between moves, a quick zoom-in on each expression change or keyword, a shake on violent beats.
- **Follow the action:** when something is thrown, poured or falls, the camera tracks it from a sensible distance so it never fills the screen.
- **Smooth handoffs:** every move eases in and out over at least about 0.25 s. Pose changes blend; nothing snaps.

## Pace
- The voiceover is sped up about 6–12% (final length still over 60 s). There's a new visual beat about every 2 seconds, and every line has a picture.

## Captions and sound
- **Captions:** one word at a time, white with a black outline, bouncing in, always in the same spot about 70% down the screen.
- **Sound:** library effects (`library/sfx`) land exactly on their words. A quiet music bed (`library/music`) sits about 24 dB under the voice. The whole mix is levelled to −14 LUFS.

## Render pipeline (fast and verified)
- **Bake each place once, per lighting state.** Characters and moving props are baked as separate pieces so they can animate.
- **Fast frames:** frames render with the fast renderer in 2 parallel processes, and segments are joined afterwards.
- **Check before every full render:** low-res still checks of each segment's key frames, including where props sit in hands, framing, and outlines.

### Lessons from video 1 (checked on every new video)
- **Camera paths never pass through a character.** Between two camera keys the camera moves in a straight line; if that line comes within ~0.6 m of a character's head, add a waypoint key that swings around/above them.
- **Arms out of close-ups.** Before cutting the camera close beside a character, drop their gesturing arms (`euler` low) ~0.1 s earlier so no black arm bar crosses the lens.
- **Keep the camera ~0.4 m off walls** in wide shots so no wall edge sits on the frame edge.
- **Light beams:** use `engine.light_beam` (banded wedge fading from warm core to sky colour) + `engine.beam_update` each frame (flattens a beam arm when the camera looks along it). The fast renderer has no transparency or texture gradients, so never use a single flat mesh for light.
- **Sky panorama cylinders sit far out (≈14 m)** so beams, ships and other outside objects have room in front of them.
- **Check model joins in a wide still** (caps, lids, tops sitting on what they belong to) before the full render.
