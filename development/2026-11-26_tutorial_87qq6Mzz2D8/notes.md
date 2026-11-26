# Analysis: the "Rick Clips quality with Claude" tutorial vs our style (2026-11-26)

Method: every spoken word (Whisper, word timestamps) matched against every visual state of the video (all 15,000 frames scanned;
1,578 distinct states on contact sheets; 45 large sheets with the words under each frame). His own example video = 0:20–0:52.
Compared with our brain v1 (`2.5D animation/brain/`) and our latest frames (videos 1–4, living-room test).

## What he shows, section by section (word → what the picture proves)

### 1. Characters + shading (0:55–1:32)
- Others: character sheets (pre-drawn turnarounds + poses), faces one solid flat fill → flat.
- His: face **pure white + CEL SHADING on one side** (a hard-edged lavender/blue-grey crescent on the side away from the light)
  **+ a small thin highlight along the edge** on the lit side. The shading is NOT fixed: it follows the scene light; turn the
  character or move the light and the crescent moves (shown on a rotating head with a sun icon, and again at 6:13–6:21).
- Head outline: thick, even, dark (near-black navy) line; very clean.

### 2. Expressions (1:32–2:20)
- Others: a fixed set (happy/sad/angry), swapped.
- His: reference faces as a guide, but **every expression is drawn per moment from the feeling**, and feelings **blend**
  (e.g. slightly surprised + slightly worried) → faces that are not in the references.
- **Transitions over several frames, not snaps:** the **eyebrows move first, the mouth follows**; if the eyes must change shape
  (dot eyes → lidded eyes) the switch is **hidden inside a blink**; the **head adds a small squash/bounce** on the change.
  Shown as an 11-frame strip f0–f10.

### 3. Clothes + accessories (2:20–3:25)
- Others: clothing always faces the camera, or flips abruptly between angles.
- His: the body outline always faces the camera, but the **clothing is drawn as if wrapped around an invisible round form
  (cylinder)**: when the character turns (shown turn 0° → 14° → 42° → −33°), **stripes, buttons, tie and pockets slide toward
  the side and compress near the edge**.
- **Clothing is lit by the scene light:** one side slightly brighter, the other darker, **a soft sheen, a thin highlight along
  the lit edge, subtle fold lines** where fabric bunches. **Shadows of a tree or roof fall across the clothes** (and face).
- **Hats and hair redrawn every frame to the head's tilt** (lean/rotate with it) with their **own highlights**.
- **Held objects are real 3D objects in the scene** (saw, steering wheel, thermos); **the hands land on them and grip**.

### 4. Character movement (3:25–4:32)
- Others: sheets → almost always standing, straight legs, only drawn poses; can't kneel, sit, crouch, pick up.
- His: **a real 3D skeleton under every character: hips, chest, head, knees, elbows, hands, feet**, moving through 3D space;
  **feet stay planted where they step (no sliding)**; **knees and elbows bend like real joints**; **hands reach the actual objects**.
- On top, the character is **redrawn in 2D every frame** (body, arms, legs, clothing, face, hat) to match the pose.
- Result shown: kneel down to cut the road, sit in a car with bent knees and hands on the wheel, jump, fall, swing a hammer —
  still a clean 2D cartoon. Limbs are thick dark tubes; legs bend at the knee visibly.

### 5. Backgrounds + objects (4:32–5:38)
- Others: 3D backgrounds with flat colours, no texture, very simple shapes.
- His: **the whole world is real 3D and built from code, nothing downloaded** (shows `buildWorld(scene){ terrain(16000,16000,
  wheatStrips); road(LEN, lanes:2, shoulders); guardrails(dents:[]); grass(blades:900000); sky(clouds,sun,moon) } new PickupBody();
  new CutoffSaw(); makeSign(); makeThermos();`). Road, guardrails, fields, cars, signs, saw, thermos.
- **Part by part → every part moves on its own:** car doors open to a **real interior** (seats, pedals, dashboard, thick door
  panels), **wheels turn, a guardrail bends when hit, the saw blade spins**.
- **Texture everywhere:** road cracks + small stones, seat stitching, dirt and bolts on the sign, wheat/grass fields to the
  horizon (dense grass blades, telephone poles, fences, haze).
- **The world reacts to the story:** cutting the road leaves **real grooves + sparks + dust**; a crash **bends the rail, dents the
  car, shakes the camera**.

### 6. Lighting (5:38–6:32)
- Others: flat lighting, everything equally bright, barely any shadows.
- His: **a real sun** that everything gets its light from; **objects cast real shadows**; **clouds cast soft shadows that drift
  across the fields**; **shiny objects (cars, saw, hard hat) catch small specular highlights**.
- **Time of day moves:** day → sunset → dark night (timelapse); at night **the headlights light the road and everything else
  stays dark**.
- **Key part:** characters are lit by the same sun (shading + highlights follow it) so they belong; **at night faces stay white
  and clean, not muddy grey** (shown side by side); shadows (tree, roof) land on the characters.
- Overall grade: natural daylight, moderate saturation, atmospheric haze to the horizon (not over-warm).

### 7. Camera + sound (6:32–7:27)
- **The camera follows the story:** whenever the voice names an object or an action, the camera **smoothly zooms in on it**
  (the saw cutting, the coffee spilling) **and then eases back out**.
- **Every move slow and smooth, no sudden jumps** (shown: a smooth arc vs a zigzag). Camera shake only on the crash.
- **Creative angles:** road level next to the grooves, high up looking down the highway, through the car's side window, the
  driver's own point of view.
- His example (0:20–0:52): only **3 hard cuts in 32 s**: long continuous shots, transitions by **fades/dissolves**
  ("fade transition into…", "timelapse to night", "camera flys in to the car" in his prompt).
- **Sound: every effect a real recording** (CC0: BigSoundBank, Kenney, OpenGameArt), downloaded, **not AI-generated**, placed on
  the exact frame: saw when it cuts, cars driving past, the crunch on the rail, the coffee splash.
- **Music under the voice: loud enough for mood, never covering the words.** His example: −15.3 LUFS, LRA 7.8 (more dynamic than ours).

### 8. Planning (7:27–7:43) + tools (7:43–8:16)
- Before anything is made he writes **every scene in full detail**: camera moves, angles, what each character does, and **what
  happens on every line of the voice** ("AI is only as smart as the person prompting it").
- His real prompt (readable at 7:28–7:42): he attaches the audio, the script and a **reference competitor video**, plus a strip
  of reference frames; then for each quoted script line he writes the place, the character's action ("one knee on the ground,
  cutting the side of the road… make sure the ground is actually getting damaged"), continuity ("existing cuts he already made",
  "his car is parked at the side"), camera ("camera zooms out like this reference to show the straight highway", "flys in to the
  car", "below angle or creative angles"), transitions ("fade transition into…", "day timelapse to a night but the character is
  not affected by this timelapse"), SFX + shakes on the crash, and "make sure the interior is visible when the door opens".
- **Camera editor tool:** the rendered shot + the voice waveform, **the words of the shot as clickable chips**, a time slider,
  "Play shot", **"Fly camera"** (move the camera by hand), a zoom (fov) slider, and a **list of keys per shot** (0.00 s fov 46,
  0.78 s, 2.00 s, 3.10 s, 4.02 s, 6.30 s fov 62) with Select / Copy / Delete / Add key here / Reset shot. Shots ~6 s, keys ~1 s apart.
- **Music picker tool:** watch the fully rendered video, try tracks over it, set the music volume (dB), "Save as final".
- The example story (rumble strips: "He cut rough grooves into the edge of the road, one after another. You see, there's a long,
  straight highway… where almost every night a car drifts off the road and crashes. Nobody's drunk… The cars just roll slowly off
  the edge. So the state puts up a giant warning sign… and the crashes kept coming. The only one who's happy is the guardrail
  company, which has never been busier. Then he shows up with a machine and starts grinding grooves into the shoulder, mile after
  mile, until the whole road looks ruined.") follows the same formula as ours (strange act → You see → mystery → escalation →
  ironic line).

## Compared with us: what we already match
- three.js + code-built worlds, white faces, ink-line limbs, real sun + cast shadows, contact shadows/AO, interiors with real
  furniture, word-keyed acting + camera, SFX on the exact frame, music under the voice, one-word captions, the script formula,
  planning before building.

## What we still lack (ranked by impact on the look)
1. **Character shading** — ours: flat white face with a soft fade (reads flat in the living-room test). His: a hard cel crescent
   on the shadow side + a thin rim highlight on the lit side, recomputed from the key light every frame, also on the
   body/clothes. → biggest visual gap.
2. **Expressions** — ours: 174 fixed drawings per face, swapped on the word (snap). His: faces drawn per moment, blended emotions,
   brows-first/mouth-after transitions over several frames, eye-shape changes hidden in a blink, head squash-bounce.
3. **Body + movement** — ours: arm IK only, legs straight tubes, a few poses (sit, crouch), feet slide during walks. His: full
   3D skeleton (hips, chest, knees, elbows, feet), planted feet, kneel/sit in a car/jump/fall/swing, hands gripping real objects.
4. **Clothes lighting** — ours: a textured capsule. His: side light + soft sheen + thin edge highlight + fold lines, and cast
   shadows (trees, roofs) landing on clothes and faces.
5. **Exterior scale + procedural detail** — ours: mostly rooms; exteriors stop near the camera. His: landscapes to the horizon
   (dense grass blades, wheat strips, poles, fences, haze), and fine detail built in code (cracks, stones, stitching, bolts, dirt).
6. **Objects that react** — ours: doors open, burn spot grows. His: everything part by part and deformable: wheels turn, rails
   bend, cars dent, grooves get cut, sparks + dust, blades spin.
7. **Light over time** — ours: one fixed light per scene. His: cloud shadows drifting, timelapse day→sunset→night, headlights
   that light the road at night, specular glints on shiny objects; natural grade (ours drifted to over-warm/saturated).
8. **Camera temperament** — ours: a new framing every ~1 s, whips, fov punches, shakes on many beats. His: long, slow, smooth
   moves; zoom in on what the voice names, then ease out; creative angles; fades between scenes; shake only on impacts.
   (Conflicts with our "video 3 formula" pace rules: decide which we want.)
9. **Sound sources** — ours: mostly ElevenLabs-generated effects. His: real CC0 recordings (BigSoundBank, Kenney, OpenGameArt),
   ambient sounds of visible things (cars passing). Music picked by auditioning over the final video.
10. **Tools** — ours: camera only in code. His: a visual camera editor keyed to the words (fly the camera, keys per shot) and a
    music picker. These make the user's direction fast and exact.
11. **Planning document** — ours: shot list. His: a per-line scene plan with continuity notes, reference clips/frames and camera/
    transition instructions, given to Claude with the audio + script.

## Open choices for the user (not decided)
- "Nothing downloaded" (his) vs our approved Sketchfab models for vehicles.
- His calm long-take camera vs our fast video-3 pace.
- His clean even outline vs our locked wobbly marker outline.
- Fades between scenes (his) vs our whip/flash cuts.
