# ★ STYLE v12 — LOCKED (user approved still v12j, 2026-11-14: "almost the perfect visual style")
Reference frame: `look_dev/STYLE_v12_LOCKED_reference.png`. Exact recipe frozen in `look_dev/still_v12_LOCKED.py` +
`look_dev/grade_v12_LOCKED.py` (render: `still_v12_LOCKED.py OUT.exr 100 128`, grade: `grade_v12_LOCKED.py IN.exr OUT.png -2.1`).
Locked in commit `64031ae` on branch `claude/shorts-competitor-analysis-59gfay`. Every rule below (R, C, A, F, L, W, S, CL) is part of the lock. Changes from here on are additions
(new notes appended), never silent replacements. Do not edit the LOCKED files; copy them for new work.

Locked settings, in one place:
- Render: Cycles path tracing, OpenImageDenoise, linear EXR → grade (exposure -2.1, Reinhard white 6, sRGB, sat 1.30, warm 0.035,
  cool shadows, S-contrast 0.18, bloom on >0.82, vignette 0.28). Camera 16 mm-equivalent framing as in the frame, f/4, focus 2 m.
- Light (night lamp room): lamp point light inside the lens (warm), moon sun (0.45,0.58,1.0) ×7, face spot fill from the camera side
  (warm, 110 W, 48°), warm bounce under the roof (35 W), lantern 220 W. Outline hulls are camera-only (toon.hull).
- Faces: flat white (0.97,0.965,0.95) emission ×6; 2D side fade to (0.48,0.48,0.60) away from the light; warm (1.0,0.68,0.30) up to
  85% on the lamp side; features drawn from the camera direction, centred, compact (scale 2.15 R); gaze by pupils (_L/_R);
  hat wearers' drawing dropped 0.10 R; face images with ink recoloured to warm dark brown.
- Head outline: hand-drawn marker ring, width 2.2 cm, bite 1–13% (2/3/5/8 lobes, random per character), pen width 0.5–1.2×,
  0.85 R in front of the head centre; beanie cut 0.36 R; hair cut 0.44 R with taper into the hairline. Head hull 0.6 cm.
- Body: head R 0.29 on a slim capsule torso (half w 0.21, d 0.15, h 0.31, taper 0.06, profile |t|^3.2), head 10 cm toward the
  camera and 0.76 R above the torso top, no collar; buttons/placket/pockets, knit or tweed fabric + contrasting shirt panel.
- Limbs: ink tubes r 1.5 cm; hands = arm line ending in a 4 cm finger hook; feet = 10 cm forward "L" stroke; no balls/boots/mittens.
- World: real relief on every surface (bump ×2.2), planked ceiling with rafters, joke chalkboard + sign, dust only behind
  characters, stars + horizon haze in windows, no clutter props in the lower foreground.

Addition (user, 2026-11-15): the inside of open mouths is BLACK (dark ink), not red.

Additions (user, 2026-11-16), apply to EVERY character:
- **ONE PIECE.** A character is a single rigid unit, not stacked layers. Head, face, outline, body, clothes, hat and limbs move
  together, in the same frame, with no lag, no follow-through offset between parts, no outline change and nothing appearing or
  disappearing during a move. (Replaces the older v3 "head 30% slower / hands lag the body" spring offsets.)
- **2D CHARACTER, NO LIMB THROUGH THE BODY.** Pointing or reaching uses the hand on the target's side. If the far hand must be
  used, the arm goes directly across IN FRONT of the torso toward the target: never through the torso, never behind it and out
  the other side, never looping round the outside of the body.

Pipeline change (user, 2026-11-16) — **Blender is retired** (Cycles ≈ 240 s/frame, a full video ≈ 125 h). Everything is now
generated in code: **three.js** for the 3D scenes and characters, **Remotion** for timing, composition, captions and the final
render. Target: **1–2 hours per finished video**. Free asset libraries for textures/HDRIs/models: **Poly Haven, ambientCG**
(and other CC0 sources). **Voiceover and sound effects: ElevenLabs** (connected by the user). Work is split across parallel
agents, each in its **own folder** so they never touch each other's files. The v12 LOCKED look (faces, outlines, proportions,
light, grade) is still the target; only the tools change. The `still_v12_LOCKED.py` / `grade_v12_LOCKED.py` files stay as the
look reference, not the production path.

Known notes to improve over time (not blocking): ceiling dominates the top third and is very orange; keeper's beard edge is
zig-zag; the engineer's raised finger hook is thin against the check coat; more texture variety in the set.

Additions (user, 2026-11-17), apply to EVERY full video:
- **Length is measured on the final voiceover:** after the speed-up, the finished voiceover itself must run **over 60 s** (not
  just the script on paper). Check the duration of the sped-up audio before building any scene; if it's short, lengthen the script
  and re-record.
- **Speed without losing quality:** follow the production workflow from start to finish and keep it efficient, but never cut a
  quality step (still checks, fixes, sound) just to finish sooner.
- **Every known issue gets fixed in the full build:** lighting logic, camera movement and tracking, textured 3D backgrounds,
  character movement, expressions, hands, faces, lip-sync, and the camera moves between places.
- **[SUPERSEDED 2026-11-23 → see "Story, transitions, colour (user, 2026-11-23)"]** **One connected world, fast flights between places.** All (or almost all) places of a video are built next to each other in
  the same world. To change place, the camera flies through the world to the next one with a fast, sped-up move (no cut). A
  normal transition (cut or dissolve) is used only when the next place is too far away to fly to, for a jump into the past
  (flashback) or a dream, or when the whole context changes.
- **Only finished videos are delivered.** The MP4 sent to the user has nothing broken, missing, lagging or left to fix later; it
  meets every rule in this bible. The final full-res render is checked against all of them (checklist in `CLAUDE.md`), fixed and
  re-rendered until it passes. A problem that truly can't be fixed is reported before sending, never hidden.
- **No character glitches:** while a character talks, gestures or changes expression, no body part jumps, pops, vanishes or
  flickers (engineer's hand, keeper's outline): checked frame by frame on every talking/gesture stretch.
- **No short glitches anywhere:** nothing in the background, props, light, shadows or characters may disappear for a couple
  of frames, appear from nowhere for a couple of frames, or move without a reason. Every render is scanned frame against
  neighbouring frames to catch these, and each one is traced to its cause and fixed.
- **Shadows and reflections follow the light:** characters cast shadows matching the key light; objects catch and reflect the
  real sources; everything sits in its place.
- **Captions:** fairly thick black outline + small shadow; each word bounces in exactly when it's spoken.
- **Sound effects and music from ElevenLabs** (effects accurate to their action); if ElevenLabs fails, the user provides a
  folder of effects and a music pack.


# STYLE FORMULA v12 — RULES (in progress: frame → sample → full video). Builds on locked v11; nothing in v11 is removed.

Reference: the competitor's latest short `How Mine Salting Worked` (61 s) + the 13 earlier shorts. Evidence: `research/audit_v11_smoothness_logic.md`,
`research/mine_salting_breakdown.md`. Look-dev still: `look_dev/still_v12.py` + `look_dev/grade_v12.py`.

## R. Rendering (root cause of "flat 2D backgrounds")
R1. Render with real light (Cycles path tracing for stills; EEVEE/Cycles-fast for motion), NOT bake → Workbench. Bump, wood grain,
    gaps between boards, ambient occlusion in corners and cast shadows only exist with real light.
R2. Render linear (EXR), grade in post (`grade_v12.py`): exposure → soft shoulder (faces never clip to white) → sRGB → saturation ~1.35
    → warm highlights / cool shadows → gentle S-contrast → bloom on light sources only → vignette.
R3. No coplanar faces anywhere (they self-shadow to black under real light): keep every overlap ≥ 2 cm (fixed: gallery deck, roof caps).
R4. Outline shells (inverted hull) are visible to the camera only — never to light/shadow rays (fixed in `toon.hull`).

## C. Characters (user points: round shaded heads, competitor torsos)
C1. Head = a lit sphere, WHITE skin (0.97,0.965,0.95) — not human/cream skin tone (user, after v12c) — with only light shading. The scene lights shade it: warm on the light-source side,
    a coloured shadow on the far side, a darker ring just inside the outline (light bounce / roundness). Faces must read as spheres.
C2. Face features are drawn ON the sphere (projected from the look direction), not on a flat card: they wrap round the head, take the
    scene light, and the hat/hair geometry covers them (fixes "features through the hat" when looking down or nodding).
C3. Ink = warm dark brown (0.11,0.075,0.06) for outlines, facial lines, limbs, hands, boots. Outline ~1.2 cm on heads/torsos.
C4. Torso = slim rounded CAPSULE (flat-ish sides, rounded top/bottom; profile |t|^3.2), ~0.72 of the head's width, ~1.05 head
    diameters tall, only slightly wider at the bottom (taper 0.07), thin front-to-back. NOT a fat bean (user, after still v12a).
C4b. The head sits ON the torso (chin only ~6 cm into it) so the outline runs all the way round the head, including the chin line
    over the body (user: "the down part of the head circle is not outlined").
C1b. FACES ARE FLAT 2D DRAWINGS (user, most important, after v12e): the face drawing is projected from the CAMERA direction, so it
    never bends around the sphere. FEATURES ALWAYS STAY CENTRED as a compact group in the middle of the head (drawing scale 2.15 R)
    — even when the character looks sideways; looking is done with the PUPILS (gaze variants _L/_R = screen-left/right), plus
    expressions/lip-sync; the drawing never slides to the side (user, after v12g, from the competitor frames).
    No 3D sphere shading on the face: flat white (emission) plus a soft 2D fade-shade on the side away from the key light.
    Hat wearers: drawing dropped 0.10 R so the eyebrows sit under the brim, not behind it.
C1c. Faces read WHITE (≈215–220/255 after grade, emission 6.0) with "a bit of beam light": warm lamp tint (1.0,0.68,0.30) up to 70%
    fading in from the lamp side, cool-grey fade (0.48,0.48,0.60) on the far side, warm up to 85% on the lamp side — more light & shade (user, after v12h).
C4e. Head outline is a HAND-DRAWN MARKER STROKE, never a perfect circle (competitor heads): thick (~2.2 cm ≈ 3.8% of the head
    diameter), the stroke bites 1–13% irregularly into the head edge (clearly uneven, user after v12h) (2/3/5-lobe wobble, random per character) so the VISIBLE head
    shape is slightly lumpy; pen width 0.5–1.2× along the stroke; outer edge always ≥ 1.03× the true silhouette (user, after v12g).
    Hair (no hat): the stroke continues up the sides into the hairline (cut at 0.44 R) and tapers there — no unfinished outline
    with blunt ends below the hair (user, after v12i, engineer). Beanie wearers keep the cut at 0.36 R under the cuff.
C4c. Head outline = a drawn ring on the head's camera silhouette, placed 0.85 R in front of the head centre so the full circle shows
    (chin line drawn over the body); the arc is cut only where a hat/hair covers the top (user: "not full 360 outlined").
C4d. Nothing of the body may stick out in front of the chin: no collar ring; the head is moved 10 cm toward the camera and sinks
    0.24 R onto the torso so the torso top
    hides inside the head and the chin line lands exactly on the face edge (user, after v12c).
CL1. Colour separation: each character wears a colour that stands out from the set (contrasting shirt/coat panels); the set's
    upper areas stay darker/neutral, warm light stays in pools and shadows go cool (grade: cool shadows, warmth 0.035).
C5. Clothes are cloth, not plastic: weave/knit bump, a pattern per character (plaid, tweed, knit ribs, seams), collar ring, placket,
    buttons, pockets; one signature accessory (glasses, rose, monocle, watch chain, badge).
C6. Hands = NO blobs/mittens (competitor): the thin arm line simply ends in a small finger hook (~4 cm stroke) that grips props;
    always in front of the body when gesturing (never inside the torso);
    check every frame that each hand is visible when the action needs it.
C7. Limbs: thin dark ink lines (r 1.5 cm); legs a bit longer than the torso; FEET = a short forward stroke at the ankle (an "L",
    ~10 cm), no boots or balls (user + competitor frames, after v12h).

## A. Acting and faces
A1. Calm by default: neutral, half-lidded, smirk, side-eye, small "o" mouth. Peak reactions (laugh, shock, scream, furious) ≤ 15% of
    the time and ≤ 1 s each, then back to calm. No character stays wide-eyed for a whole scene.
A2. Talking partners turn ~50° to each other and stay open to the camera (gaze = 60% partner + 40% camera).
A3. Bodies stay calm: weight shifts, small leans, hands talk; jumps/shakes only on real story beats.

## F. Framing and camera
F1. Head width ≈ 18–25% of frame width (median). Dialogue close-ups ≤ 30%, rare. Full bodies in medium/wide shots. Never crop the top
    of a head. Measured target: competitors 21% median; v11 was 37.5% (too close).
F2. One continuous spline per shot (no ease-to-zero at every key); ease only at shot start/end; holds ≥ 1.2 s; speed/acceleration caps.
F3. [SUPERSEDED 2026-11-23: glide only within a place; far places = designed cut + sound] Between places: real camera flights through the connected world, or a hard cut when time jumps. No double-exposure dissolves.
F4. Per-frame camera check: nothing within 0.6 m of the lens, no wall/plank filling the frame, both heads fully in frame when they talk.

## L. Light logic
L1. Every scene has a visible key source (lamp, window, lantern, sun) and the characters are lit FROM it; plus a soft warm fill on faces
    from the camera side, and a cool rim from the opposite side at night.
L2. Night interiors: warm pools of light with falloff, darker corners, cool moonlight through windows — never studio-flat.
L3. The lighthouse lamp is a real light INSIDE the lens: glowing core, warm glass that never blows out to a white blob; beams start
    inside the lens, soft additive cones that fade with distance and never sweep across the camera as a slab.
L4. Night exteriors keep contrast: warm windows, moon rim, sea highlights — not one flat blue.

## W. World (user: "backgrounds look 2D")
W1. Every surface has relief: wood grain + gaps, plank-to-plank tone variation, rock/plaster with cracks and bump, metal with wear.
W2. Ceilings and upper walls are built (rafters, beams, pipes, lamps) — never an empty flat cone.
W3. Dressing in every shot: props with jokes (signs, newspaper headlines, calendars, labelled crates), scattered small debris on floors.
W4. Depth layers in every frame: foreground prop, characters, mid-ground set, lit background through a window/door.
W5. Detail kit per interior: joke sign/chalkboard, dust motes in the key light (never in front of faces), stars/haze in windows.
    No clutter props in the lower foreground of the frame (user removed the stool/cans/bucket/rag/debris after v12c).

## S. Sound and voice
S1. Master at −14.0 LUFS (v11 was −14.9). More distinct sounds (target ≥ 30 different effects per video).
S2. Voice 3.8 words/s, pauses ≤ 0.34 s (needs the new recording).


# STYLE FORMULA — LOCKED v11 (approved by the user on the lamp-room sample `videos/00_tests/t13_style_v11.mp4`)

Every layer below (v2 … v11) is cumulative: newer notes refine older ones, they never delete them. A video must satisfy ALL of:
1. **Story & script** — hook in the first sentence, mystery → rhetorical question → explanation → running joke → twist →
   button; funny exaggerated lines; ~3.8 words/s after the speed-up, no pause over ~0.35 s; > 60 s.
2. **Every line has its own picture** (shot list first), with a visual gag or sign joke wherever possible.
3. **One connected 3D world:** places built where they really are (lamp room on top of the tower, tower on a rock in the sea,
   cottage below, harbour town across the water) and the camera flies between them; hard cuts only for real jumps in time or
   place; quick dissolves for night ↔ day.
4. **Characters** (puppet v11): outlined round cream heads sitting on short fabric bodies with patterns, bending ink limbs,
   navy ink, soft shading INSIDE the outline; 2D faces that turn ~50° towards whoever they talk to (3/4, features partly hidden),
   lip-sync, expressions changing every ~0.6–1 s, moving eyes, blinks, 2D emotion graphics.
5. **Acting:** calm human bodies with real-life logic (sit, put things down, lean-push-rise, head leads turns, feet step round),
   exaggerated faces, hands that illustrate the words, listeners react, everyone relates to each other.
6. **Look:** baked textured sets + set dressing in every shot + foreground props; real character shadows on the floor; depth
   air; lens blur; warm sources against cool ambience; bloom on lights only; dust; grade per mood (actors only lightly graded);
   vignette.
7. **Sound:** voice + ambience bed per place + an effect on every action + music bed ~13 dB under the voice; −14 LUFS.
8. **Captions:** one word, bounce-in, fixed spot ~70% down.
9. **Checks:** low-res still checks of every beat before the full render; no flashes (max frame-to-frame jump checked).

## Visual principles (user, locked with v11)
*Stylized 3D cartoon animation: clean, dark-outlined 2D facial features on softly rounded, volumetric heads. Faces keep a flat
illustrated look, while subtle spherical gradients, directional highlights, soft shadows and ambient occlusion along the sides
of the heads give a convincing 3D form. Environments are fully 3D, highly detailed and richly textured, with realistic materials,
intricate elements and strong spatial depth. Vibrant, highly saturated cinematic grading with rich warm highlights, contrasting
shadows and atmospheric light — a polished animated-movie look: simple illustrated characters in immersive 3D worlds.*
- Implementation: head bake = spherical gradient from the head's own normals + upper-left highlight + side/under occlusion
  (`puppet.bake_puppet`); faces take a share of each place's light in post (night 36%, interior 22%, morning 25%, day/town 15%)
  but never turn fully blue; grades are vivid and warm (saturation 1.3–1.6).

# STYLE FORMULA v11 notes

v11 (user review of v10):
- **Characters look at each other:** when talking or reacting, the head turns TO the other person (45-70 degrees), not to the
  camera; the drawn face then shows a real 3/4 view — features slide across the head and squeeze, and the ones past the edge
  are simply hidden (face decal = head-sized disc, features moved in UV space per frame: `puppet.apply_face_uv`).
- **Shading lives inside the outline:** heads have a soft shadow side inside the ink line (head shadow tone 58%); character
  shadows from the shadow pass fall only on the floor and low objects — never a dark halo on the wall behind a head.
- Drawn face/emotion decals are excluded from the depth/actor and shadow passes (they are see-through, not geometry).

# (v10 notes)
# STYLE FORMULA v10

Built on v2–v9 (nothing removed). From the v9 deep comparison (metrics vs 4 competitor videos):
- **Clothes are fabric, not plastic:** muted fabric colours, patterns (sewn seams on raincoats, tweed check on waistcoats),
  painted seams/hems, a clearly darker shadow tone on bodies (52% of lit) while heads keep the soft 64% tone.
  Torsos shorter and fuller (≈0.72 m tall, 0.21 m wide).
- **Warm vs cool at night:** every night scene has a warm gold source (the lamp glows gold through the lens) against the cool
  moonlit room. Night grade brighter (median ≈130–150) — never a dim blue world.
- **Movement logic:**
  - turns are led by the eyes and head; the body follows more slowly; feet keep their own direction and step round
    (no spinning on the spot); the hips shift over the standing foot while the other foot steps;
  - standing up from a seat = lean forward over the feet, hands on knees, push up, then walk;
  - sitting = knees forward, optional crossed leg (`cross`), hands resting on the thigh or holding the prop;
  - props are put down on real surfaces before the hands are used for anything else.
- **Every shot is dressed:** a sign/board joke placed where the camera actually sees it (DAYS WITHOUT A SHIPWRECK: 3),
  foreground props near the camera paths (blurred by the lens), background props in view.
- **Framing:** two-shots keep both characters fully in frame; faces ≈30–45% of frame width; push in only on a beat.
- **Sound:** gesture swishes, footsteps, put-down clinks, sitting creaks — an effect on every action, over the ambience bed.

# (v9 notes)
# STYLE FORMULA v9

Built on everything above (v2–v8) — nothing removed. Additions from the "Mirror Rigged a Horse Race" breakdown
(`research/breakdown_mirror_horse_race.md`):
- **Faces stay cream / near-white in every light** (character light preset `soft`: warm-white key, grey-violet fill, pale rim
  streak, soft two-tone). The scene grade colours the WORLD; characters get only a light "actor" grade (actor mask from the
  depth pass) — never tinted blue at night.
- **Dark-navy ink** for outlines, limbs and drawn features (not black).
- **Eyes move:** every open/lidded/wide expression has left/right gaze versions; pupils point at the look target automatically.
- **2D emotion graphics** over the face on cue (`fx_seq`): sweat drop, blush, tears, anger vein.
- **Prop acting:** props live in the hands and are put down on real surfaces (mug on the crate); one hand holds, the other talks.
- **Sitting:** `crouch≈0.9` + `feetfwd≈0.3` on a seat at the right height.
- **Sign jokes** in the set (readable boards that comment on the story).
- **Ambience bed** per place (waves + wind for the lighthouse) under every scene, plus an effect on every action.

# (v8 notes)
# STYLE FORMULA v8

v8 = the full 4-pass look with no shortcuts (`pipeline/passes.py`, `post_fx.py`):
- **Depth/actor pass** (per frame, ~0.13 s): every vertex's camera-space depth is written into a colour attribute and the frame
  is re-rendered showing vertex colours -> an exact depth image + a character mask (the fast renderer has no depth output).
- **Shadow pass** (per frame, ~0.10 s): the characters are rendered alone from the scene's main light (`sc["shadow_light"]`);
  post rebuilds every pixel's world position from depth and tests it against that light view -> each character casts its
  real silhouette shadow onto floors/walls/props (shadow mapping), softened and tinted cool.
- **Post order:** world -> air (depth fog per mood, characters excluded) -> lens blur (in the render) -> shadow pass ->
  contact shadows -> haze -> bloom (lights only) -> particles -> grade -> vignette.
- **Framing:** close-ups keep the whole head and hat in frame; open each place on a wide/high angle that shows the dressed set
  and the shadows before pushing in.

# (v7 notes)
# STYLE FORMULA v7

From the niche creator's own guide ("How to make a 3D cartoon look this good", 2026-11-12) and the slot-machine short:
the look = a plain build + **4 passes**:
1. **Camera** — a real camera that moves in close: one face fills ~40–67% of the frame width. Camera styles to pick per video:
   *Dread Cuts* (hard cuts on words, low tilted camera, slow push every shot), *One Take* (one unbroken floating camera),
   *Found Footage* (shaky phone camera in their faces), *The Watcher* (long lens from far away, creeping closer),
   *Through the Steel* (camera follows the sound through walls/water from place to place).
2. **Environment** — flat walls become real sets with texture (bolted steel, rivets, pipes, crates, barrels, rope, pictures,
   lanterns); characters stay the same, the world around them is rebuilt and dressed.
3. **Post** — every frame: world → air → haze → depth of field → bloom → screen → actors → particles → grade.
   Characters go on top and are never blurred.
4. **Shading** — light hits faces and clothes from the scene's light: a lit side, a soft shadow side and a **pale streak on the
   edge**; heads are cream, never flat bright white; plus a **shadow pass** (each character's shadow as the light sees it).

Our implementation:
- Characters are baked under the scene's light preset (`LIGHTS` in puppet.py: `night_lamp`, `day_window`, …): warm key from the
  scene's main light, coloured fill from the ambient side, a strong rim from behind for the pale streak; three tones
  (shadow 50% / lit 90% / streak 112%); cream skin (0.80, 0.76, 0.70); face whites tinted by the scene.
- Sets are dressed (`lamp_room.dress`) and lit warm-versus-cool (warm lamp/lantern pools, cool moonlight through windows).
- Post: soft contact shadows, haze glow only around real light sources, bloom only above 93% brightness (faces never glow),
  gentle hue-preserving night grade with dark ink kept dark, floating dust motes, cinematic vignette; real lens depth of field.
- Closer framing: faces fill much more of the frame; low angles; two-shots for contact moments.

# (v6 notes)
# STYLE FORMULA v6

v6: **2D animation with a touch of 3D, not 3D animation.**
- **Faces are 2D:** the drawn face disc always faces the camera exactly and sits inside the head circle (radius 0.8 R), so
  beards/features can never stick out of the head from any angle. Head turns are shown the 2D way: the drawn features slide
  sideways inside the circle (up to 0.17 R) towards where the head points.
- **Flat two-tone shading on characters:** lit tone + soft shadow tone (shadow ≈ 70% of lit, soft edge), instead of smooth 3D
  gradients. Thick ink outline all round. Reads as a drawing with a little depth.
- **Camera on contact moments:** two-shots when characters touch or react to each other (the shoulder pat), and a closer shot
  on whoever delivers the punchline gesture.

# (v5 notes)
# STYLE FORMULA v5

Reference description of the style: *stylized 3D cartoon storytelling, minimalist round-headed characters, exaggerated body
language, expressive facial animation, playful physical reactions, cinematic environments; characters move continuously and
naturally — tilting heads, leaning, gesturing, changing expressions to match the narration; vibrant saturated colour, soft
cinematic light, strong warm-vs-cool contrast, dynamic camera angles; polished, playful animated world.*

v5 rules:
- **Characters relate to each other:** bodies stand 3/4 towards each other (between the partner and the camera); heads turn
  towards whoever they talk to or react to (`look_target`, `look` weight) so the face is 3/4 but still readable. Physical
  contact sells it (a patronising pat on the shoulder).
- **Every reaction is about what is being said:** the listener humours, doubts, gets offended, glances at the object being
  discussed, folds arms when challenged, and gets the punchline gesture (presenting the lens on "but it works").
- **Continuous natural life:** slow weight shifts, a head that keeps tilting a little, leans in/out with emphasis, a laugh
  body-shake (`shake`) — always smooth, never jittery or fast.
- **Dynamic camera, faces always visible:** low-angle two-shots, front 3/4 angles from either side, slow pushes; never shoot the
  back of a talking head. Cameras stay inside the set (clamped) — a camera outside a wall can be swept by beams/props.
- **No flashes:** light beams hide any arm whose path would cross the camera (`engine.beam_update`).

# (v4 notes)

v4 corrections (user review of the v3 sample):
- **Whole head outlined:** the head sits fully above the body (centre = torso top + 0.97 R) so the jaw line gets the same thick
  ink line as the rest of the head. The head must read as a complete circle standing out from the body.
- **Human pace, not puppet pace:** default motion is slow and smooth (snap 0.38 s, damping 0.72 = no bounce). Fast snaps only for
  real hits (poke, slap, jump). Body bends are small in talking beats.
- **While talking: body calm, head steady and facing camera, hands do the expressing, face never stops changing.**
  Hands make slow, readable gestures that illustrate the words (thumb to chest = "I", open hand to the object, mime the action,
  finger up for numbers, finger wag for "can't"), each held ~0.5–1 s. Gesture with the arm on the camera side so it reads in
  front of the body.
- **Faces:** lip-sync mouth shapes per syllable (A open / O round / E teeth / closed on m-b-p) on top of a base expression that
  changes every ~0.6–1 s; eyelids/brows shift between related expressions; blinks every 2–3.5 s. Listeners react with the
  face (skeptical, bored, smug) while their body stays still.
- **Night colour = hue-preserving blue moonlight** (`post_fx.night_vivid`): objects keep their own colours under strong blue
  light, warm sources/pools stay warm, faces and whites stay bright lavender-white. (The v3 monochrome-blue ramp is retired.)

# (v3 notes)

v3 changes (after the second competitor study, "The Burglar Who Only Moved Furniture"):
- **Head is a separate circle sitting ON the body** (head centre = torso top + 0.8 R; only ~4 cm overlap), never sunk into it.
- **Proportions:** head radius 0.29 m; torso ≈ 0.7 × head width, visible torso ≈ 1.35 × head diameter; legs ≈ 1.1 × head diameter, thin.
- **Spine bends** (shape keys: forward 0.95 rad, back 0.6, sideways 0.55): sneaking, leaning in, arching back to laugh, folding over,
  slumping, hip-cocked weight shift. The head and shoulders ride the curved spine.
- **Spring-driven motion:** every channel (lean, bend, crouch, head, hands) follows its pose target through a damped spring
  (overshoot + settle); the head is 30% slower than the body (overlapping action); hands lag the body (follow-through).
  `snap` sets speed, `damp` sets bounciness (0.3 = bouncy hit, 0.5 = smooth).
- **Jumps are gravity arcs** with an automatic squash on landing.
- **Calm life:** slow weight shift + breathing + slow head drift. Never jitter.
- **Talking body language:** `talk(words,a,b)` adds beat gestures (head nod + hand bump on stressed words) and mouth flaps.
- **Faces change constantly:** a new expression about every 0.8–1.2 s, automatic blinks every 2–3.5 s, mouth flaps while talking
  (every expression has `_blink` and `_talk` versions).
- **Night colour = bright saturated cobalt** (`post_fx.night_vivid`): indigo shadows → cobalt mid-tones → lavender whites, while
  warm things (lamps, light pools, red/orange/yellow objects) stay warm. Target: median brightness ~185/255, saturation ~180/255.
  Day grade: saturation ×1.28, slightly brighter.
- **Staging:** raised arms go up-and-back, never across the face; the arm nearest the camera does the readable action.


Locked after the competitor reverse-engineering ("How One Cart Stopped an Entire Army") and the v1 lighthouse review.
The three things that matter most, in order: **how the characters look and move**, **every line has its own picture**,
**one connected world with a moving camera**.

## A. Characters (puppet v2, `pipeline/puppet.py`)
- **Proportions:** head radius ~0.25 m (diameter ≈ torso height ÷ 1.3), visible torso ~0.65 m tall and ~0.75–0.8 × the head's width,
  legs ≈ head diameter. Head overlaps the top of the torso (no neck).
- **Torso:** a narrow pill/sack with straight sides, slightly wider at the hips. It **wears real clothes**: collar, front seam or
  shirt front, buttons/toggles, pockets, waistcoat, belt with buckle, hem or trouser band, fabric grain. Details are painted on the
  cloth or sculpted flat — never floating rings.
- **Head:** near-white sphere with soft shading; hats/hair are 3D with drawn strand/rib lines; thick ink outline on head + torso.
- **Face:** drawn, always readable: the head turns towards the camera (up to ~70°) and the face rolls with head tilt.
- **Limbs:** thin black ink **noodle** arms and legs that **bend** (2-joint IK curves), round ink hands, small dark boots.
- **Bake once per character** (`python puppet.py -- <name>`), then append into any scene. Scene light is applied as a **tint**
  (e.g. night 0.66/0.70/0.90) so characters sit in the place's light.
- **New characters:** add an outfit to `OUTFITS` (colours, hat/hair, details). Crowds = several outfits with small colour changes.

## B. Acting (most important)
- **Pose to pose.** Each beat is one clear full-body pose: crouch, reach, lean, point, jump, recoil, slap, knee-slap, lie down,
  hands on hips, facepalm, shrug, arms folded, blow on finger. Hold it, then **snap** to the next in ~0.1–0.25 s with a small
  **overshoot** (bigger snaps for hits/pokes).
- **Anticipation → action → follow-through:** wind up before a poke/throw, recoil after, settle.
- **Calm holds:** in a hold only slow breathing. **No constant bobbing, swaying or jitter.**
- **Stage for the camera:** actions happen in profile or 3/4 so the arm/leg silhouette reads against the background.
- **Feet are planted** and step when the body moves; jumps leave the ground with gravity-like arcs and squash on landing.
- **Head acting:** nods, tilts and turns on the beat; head bops to rhythm gags.
- **Everyone reacts:** background characters react (turn, flinch, laugh) — nobody stands dead still.
- **Comedy:** at least one visual gag every ~8–10 s (smoking-gun finger, DJ scratch on a spinning lens, sandwich, seagull spy).

## C. Every line has its own picture
- Write a **shot list before building**: one visual per clause. Abstract lines get concrete images
  (e.g. "the town says…" = townsfolk gossiping, pointing and laughing in the square).
- Build every place and extra character the shot list needs (crowds, townsfolk, sailors, doctors).

## D. World, camera, transitions
- **One connected world:** places are built where they really are (lamp room on top of the tower, tower on the rock, town across the
  water) so the camera can **fly** from one to the next (out of the window, down to the sea, across to the town).
- **Within a beat** the camera drifts slowly and pushes in on the action; between beats it glides/flies to the next focus.
- **Framing:** medium-wide by default so the whole body acts; push in only for the detail that matters (finger on glass, teeth).
- **Hard cut only** for a real jump: back/forward in time, or a completely different place. Time-of-day jumps use a quick **0.3 s
  dissolve** while the camera keeps moving. No white flashes.
- **Depth of field:** real lens blur on everything outside the focus (focus follows the camera target).

## E. Look and light
- Baked 3D sets (wood grain, paint, fabric, rounded edges, AO) + **contact shadows under characters** (soft floor ellipse + boot
  contacts, projected per frame) + **glow** on lights + **colour grade** per mood (day / morning / night / interior) + soft vignette.
- Light follows real logic: one visible source, lamps off in daylight, characters tinted by the place's light.

## F. Voice, captions, sound
- Script ~250–270 words; VO sped up so the video lands at 62–70 s with **no pauses over ~0.25 s** (competitor: 3.5 words/s).
- Captions: 1–3 words, white with black outline, bounce in, fixed spot ~70% down.
- Sound: whoosh on fast camera moves, soft swoosh on dissolves, hits on pokes/slaps/landings, cartoon effects (boing, gasp,
  laughter) on gags, ambience per place (waves, wind, rain). Music bed ~24 dB under the voice; master −14 LUFS.

## G. Pipeline and time budget
- Characters baked once (~1 min each). Each place baked once per lighting state (~1 min).
- Frames: fast renderer + DOF, 3 processes (~2.5 s per frame per process at 1080×1920); post pass ~0.1 s/frame.
- Always: low-res still checks of every beat before a full render (pose readability, framing, props in hands, camera paths).
- Target total per 65 s video: ~2–2.5 h including checks.

---

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
- **[SUPERSEDED 2026-11-23: one cool base + hot accents for the whole video]** **Calm, not neon.** Saturation is never pushed. Pair one warm and one cool family per location, e.g. warm wood with sage/teal walls, or blue night with warm lamps.
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

### Video 1 rebuild in locked v11 (build_v11.py) — world layout used
- Lamp room at the origin on top of the tower (`sets/exterior.py`: gallery, banded tower, rock, sea, far harbour town, sky dome);
  the camera flies out of the windows for "the beam sweeps" and "the ships stayed safe", and looks back in through the window
  for the ending. Ships sail the real sea outside the windows (near-miss by the rocks, safe pass under the beam).
- Cottage below the tower (day → winter dissolve, gulls with a spyglass on the ledge).
- Harbour town across the water (`sets/town.py`): signs (FISH, BAKERY, TAVERN, GOSSIP & TEA), well, bunting, boats; townsfolk
  puppets (fisher, baker, lady, kid) laughing, pointing at the lighthouse, tapping their heads, the kid imitating the keeper.
- Segment joins: hard cut only for the hook → "You see" (time jump back); dissolves for night ↔ morning ↔ cottage ↔ winter ↔ town ↔ night.
- Background depth: real distant geography (sea, horizon, town lights), depth fog per scene (`air_dens`), lens blur f/1.8,
  foreground props in interior shots.
- **Captions size (user, 2026-11-17):** font 72 px at 1080 wide (was 92, ~22% smaller), outline 9 px, scaled with the video width.
- **3D depth and texture (user, 2026-11-17, after video 1):** backgrounds must read as fully 3D and highly textured, never flat
  (video 1's town facades were too flat). Real modelled relief on every surface (bricks, beams, frames, sills, cornices, roof tiles,
  raised cobbles), several depth layers (foreground props, mid set, far set, distant silhouettes) with visible parallax in camera
  moves, varied worn materials, AO/contact shadows in corners, and rich small detail in every still.
- **Voice (user, 2026-11-17, after video 1):** quoted character lines are spoken in that character's own voice/tone (not the
  narrator's); the narration stays calm and natural, never exaggerated.
- **Transitions (user, 2026-11-17, after video 1):** a change of context without a camera flight is always a designed transition,
  never a raw hard cut (raw cuts looked glitchy and make viewers scroll away).
- **Colour (user, 2026-11-17, after video 1; extended 2026-11-23: ONE scheme for the whole video):** one harmonious palette per place (dominant + accent family); characters contrast
  with it instead of fighting it.
- **Opening retention (user, 2026-11-17, after video 1):** the first 10–15 s must never drop in pace (video 1 slowed at ~3–3.5 s
  after the hook). Camera always moving (no resting keys), a new picture/strong action every ~1.5–2 s, no raw cuts, no voice
  pauses, an accent sound on every beat.
- **Characters on screens and prints (user, 2026-11-19):** anyone shown on a TV, CCTV monitor, photo, newspaper, poster or book is
  a REAL render of our locked characters (marker outline, flat white face drawing, capsule body, lit), rendered into the
  screen/print texture — never a minimal placeholder drawing (thin smiley faces, flat cardboard bodies).
- **No beards on new casts (user, 2026-11-19):** old men get the `folkm` face (bushy scalloped moustache in the same drawing style, generated by `kit/tools/faces_moustache.py`), not the `folkb` beard face (kept only for video 1's look).
- **Eye-lines (user, 2026-11-19):** characters look at whoever/whatever the beat is about — talking partners look at each other,
  a character watching a TV/object looks at it — by moving only the PUPILS (features stay centred). Every acting state sets
  `lookAt` (world point; the character code picks the _L/_R pupils automatically). Looking into the camera only when the beat
  is aimed at the viewer (e.g. smiling/waving at the security camera). Gaze drawings shift the pupils ~0.12 R so it reads.

---
## 2026-11-19 — Lessons from video 2 (lemon juice robber): do NOT repeat
User notes collected while making video 2. Each one cost a re-render; check them BEFORE the first full render.
**Cast (faces, bodies, clothes)**
- Faces come from the face library (`visual_library/FACES.md`, 21+ sets). No two main characters share a face set; new identities
  go into the library (`kit/tools/face_library.py` + `face_index.py`). No beards on new casts unless the story needs one (moustache set `folkm`).
- Bodies and clothes are built FOR EACH VIDEO (coat type/colour/pattern, hat, hair, accessory, scale). Never reuse a previous
  video's character as-is: same style rules, new person.
- Everyone must look like our locked style (white face disc, ink ring, slim capsule body, hook hands, L feet). TV/news/photo
  people are real renders of real specs, never simplified drawings.
- Eye-lines: `lookAt` on every character in every beat (talking partners look at each other). Pupils must read clearly at render size.
**Props and hands**
- A prop never pops between a surface and a hand. The hand reaches it first, then the prop eases from its resting pose into
  the hand (`blendFrom` in v02 Video.jsx `attach`), and back the same way when put down. Keep the prop in frame while it is picked up.
- Props rest ON their surface (contact checked in a still); nothing floats, nothing sinks.
- The device a character uses (camera, phone) is in frame when the action happens (show it from behind/over the shoulder).
**Camera and transitions**
- A scene with one character for a long time must keep switching: a new framing every ~0.7–1.5 s (macro insert on the prop,
  push-in on the face, quick pull-out, over-the-shoulder, low angle, orbit). Never one long static shot.
- Push-ins and pull-outs are smooth splines; a push into a small object (photo, screen, page) arcs over anything in the way
  (never through a body), rolls so the object ends upright, and lands square-on and filling the frame.
- Flights through windows go through the OPEN part (sash), never through glass. Long jumps between far places use a designed
  swap (dive into a page/screen that fills the frame, rewind, whip), never a flight through empty void.
**Story pictures**
- The video's key idea must read in ONE glance in its picture (video 2: the selfie face is pure glowing white, no features).
  Check that still on purpose before rendering.
- Gag overlays (idea bulb etc.) float clearly ABOVE the head with space, big, glowing.
**Seated characters**
- Seated people are framed 3/4 (not straight-on behind a table) so bent knees and feet on the floor read; straight-on, the shins
  overlap the seat front and look sunk into the couch. Check with a side view (`--props='{"dbgCam":{...}}'` in v02 Video.jsx).
**Process**
- Heads 18–25% of frame even in "close" coverage; check contact sheets at full-video level for this.
- Library first for SFX/music/visuals; every new SFX/music goes into `asset_library` with an INDEX row the same day; every new
  builder goes into `visual_library/INDEX.md` before the video is delivered.
- Two surfaces from different builders must never share a plane (video 2: the street facade's back face and the apartment's
  window wall both at z -9.0 flickered once the camera saw that wall at an angle). When an interior sits inside an exterior
  shell, offset one face by ≥2–3 cm and make sure facade "room cards" behind windows never poke into the real interior.
- Held papers/books stay clear of the face (≥10 cm in front): a sheet lowered through the head shows the face drawing through it
  (video 2 professor). `readNewspaper` has `reach` for this.
- The ending picture must match the story's outcome (video 2: a smug robber reading his textbook read as a happy ending; the user
  wanted him caught: cuffed, sad, mugshot flash, the frozen frame revealed as the newspaper front page). Short "punchline" beats
  (e.g. "his eyes are burning, but the plan works") still need a new framing every ~0.4–0.5 s and an action on each half.


---
## 2026-11-23 — Story, transitions, colour (user feedback on video 2 + competitor deep-dive). WINS over older notes
Evidence and numbers: `analysis/astronauts_flush/ANALYSIS.md`. These were partly in the rules (curiosity gap, karma payoff,
shutter on cuts, two colour families) but not enforced, and two older rules (fast flights everywhere; "calm, not neon") pushed
the wrong way. From now on:

**A. Story spine (script gate: a script that fails any line is rewritten before voice is generated)**
1. **The hook makes a promise that only the LAST line pays.** It names a stake (danger, loss, absurd consequence), not the trick.
   Never give away the mechanism in the first 40 s.
2. **One protagonist, one place cluster, one question.** No new main character after the first third; no lecture or expert
   tangent (video 2's professor/Dunning-Kruger part lost viewers).
3. **A chain of cause and effect:** rule/setup → someone breaks it (attitude, quoted line) → a strange consequence we can SEE
   (a mystery picture) → bigger consequence (ticking clock, blame, escalation) → the viewer's question said out loud near the
   middle ("But how does …?") → the mechanism in 2–3 picture steps → the last line ties it back to the hook's stake.
4. **Every setup pays off and every payoff was set up.** List them in the script file (setup → payoff, with times).
5. **Tension rises in every block of ~8 s:** each beat raises the stakes or opens a question before the last one is answered.
6. The ending is the story's real outcome (consequence/karma), shown as a picture, never a happy or neutral wrap-up by accident.

**B. Two hook/topic formats**
- **Story:** "He/They did [strange deliberate act]…" (as before, but stake-first).
- **"If you…" / what-if (second person):** "If you [everyday act] in/at [unusual place], you'll [shocking consequence]." The
  viewer is the protagonist; we SHOW what happens step by step ("You see, …", the rule, someone like you breaks it, the strange
  result, the escalation, the reason, the payoff). Use it for hypotheticals ("what happens if…") and for real facts.

**C. Transitions**
- **Glide (continuous camera) only within one place or between two places in direct view of each other** (≲10 m, e.g. kitchen →
  couch in the same room).
- **Everything else is a designed cut**, never a flight across the world: match cut on a shared picture (the same message on two
  screens, a photo, a sign), sound-bridge cut (radio crackles → the speaker), whip-pan, swipe, quick flash, push into a
  screen/porthole/page. Keep it fast: ≤0.3 s of transition.
- **Every place change and every whip/flash/dive gets an accent sound** (shutter click, whoosh, swipe, crackle, impact), placed on
  the cut frame. Check with `kit/tools/transition_check.py` (every change should read ≳8× median).

**D. Colour: one scheme for the whole video**
- Pick ONE video-wide base family (e.g. cool navy/teal/blue) + ONE complementary accent family (e.g. yellow/orange/red). Every
  place is built and graded inside that scheme, so cuts feel like one world.
- Saturation lives in the accents and the characters' clothes (the protagonist's colour is the brightest thing in the frame);
  backgrounds are darker, cooler, less saturated. Avoid saturated brown/beige/orange MIDTONES (video 2: 78% of saturated pixels were
  orange-brown, nothing popped).
- Real darks and a few crisp highlights (screens, lamps, stars). A colour change (e.g. red alarm light) marks a turning point.
- Check with `kit/tools/palette_check.py` on the low-res render; targets (from the competitor): base family ≳60% of saturated
  pixels, strongly saturated pixels ≳30%, dark pixels 35–55%.

---
## 2026-11-23 — Sound editing rules (user, after video 3). WIN over older sound notes
1. **Never use a sound effect raw.** Library files are often long (whoosh 5.9 s, impact 4.9 s, splash 4.6 s, explosion 7.7 s,
   door creak 15 s). Cut every effect to the part that belongs to its moment and end it (with a short fade) before the next
   beat/words/scene: a splash is the splash (~1 s), not the whole water tail; an explosion is its hit (~1–1.5 s), not 7 s of
   rumble. In `sound_plan.py` every entry carries a length (`(file, time, dB, seconds)` or the CAP table); `tools/mix_fx.py`
   cuts it and fades it out.
2. **Every effect STARTS, PEAKS and ENDS at the right moment, and adds meaning.** It starts on the frame its action becomes
   visible (not before), peaks on the hit, and is cut before the next beat. It must match what we see AND what the voiceover
   says at that moment; an effect that only "decorates" (a record scratch or boing on a question, a crackle-whoosh over an
   explanation, a ticking clock with no clock, a page turn on a title, a bell on the last word) is noise and is left out.
   Cuts keep only a short, quiet accent (whoosh/shutter ≤0.5 s). The "≥30 distinct effects" target never justifies filler:
   fewer, meaningful effects beat a full count (video 3 ended at 24).
2a. **The HIT lands on the frame, not the file start.** Many library files have a build-up before their hit (explosion_big:
   0.89 s, fireball_whump: peaks at 0.65 s; flashback_swell peaks at 0.99 s). Measure each file's onset/peak and either skip
   the pre-roll (`(file, time, dB, length, skip)` → mix_fx `skip`) or place a swell so its peak hits the cut. A boom that
   starts 0.9 s after the blast was the user's note on video 3.
2c. **Flashbacks/time jumps get a flashback sound** (`flashback_swell`) whose peak lands on the cut.
2b. **Every effect sits exactly on its picture.** Each sound belongs to something we SEE at that frame (hit, slap, splash,
   flash, cut). No sound for an action that isn't on screen (footsteps with nobody walking, a door creak with no door, a gasp
   with nobody there, a boing with no bounce). Check each effect's time against the direction (what is visible at that time),
   not only against the words.
3. **Big hits are not louder than the voice.** Explosions/booms sit under the narration (about −17 to −19 dB in the pre-mix),
   no stacked thunder layers.
4. **Music from frame 1.** Before using a music bed, measure its level per second; if it has a quiet intro or gaps (the v03
   track was almost silent for its first 12 s and had a gap at 28–29 s), build the bed from its loud parts only
   (`"pieces": [[a, b], ...]` in sound.json, crossfaded by mix_fx). The music is audible under the voice from the first frame.
5. A sound-only fix never needs a re-render: re-mix (`mix_fx.py`), then mux the voice + fx onto the rendered picture
   (`ffmpeg … amix=inputs=2:normalize=0`) and master with `timeline/finish.sh` (trim to exactly −14.0 LUFS).

- **Never fill the whole frame with an effect for a whole beat** (user, 2026-11-23, video 3 "warm-up" white-out): keep the
  character readable first, then let the cloud/smoke/flash take him in the MIDDLE of the sentence; a full-screen effect lasts
  ≤ ~1 s. The viewer must always have a face or a clear object to look at.


---
## ★ VIDEO 3 FORMULA — LOCKED (user approved 2026-11-23: "almost perfect … lock it in"). Use it for every next video
Reference: `final_videos/03_if_you_light_a_candle_in_a_flour_mill/` (MP4, script, NOTES, contact sheets) and the code in
`production/kit/videos/v03/` (latest direction template). Everything below WINS over older notes.

**Script and story (worked much better than videos 1–2)**
- "If you…" second-person hook with a deadly/absurd stake ("If you light a candle inside a flour mill, the whole building explodes").
- Spine: the rule ("You see, flour mills ban every flame") → rule of three in short punches ("No candles. No lamps. Not even a
  match in your pocket.") → the mocker's quoted line in his own voice ("It's flour! It makes pancakes, not bombs!") → the sneaky
  act → a strange, beautiful mystery picture (sparks like fireflies) → a small first payoff (whump) → escalation + ticking clock
  ("And the candle is still burning.") → the viewer's question out loud → the mechanism in 3 picture steps (pile / oxygen / chain)
  → the big payoff → a real-history anchor (1878) → a callback button that flips the mocker's line ("And it makes bombs.").
- Punchy, powerful words; one-word sound lines ("Whump." "Boom."); short sentences; ~275 words.

**Pace (the fast pace worked)**
- Voice ~4.4 words/s after speed-up (TTS speed 1.1 + atempo ~1.29), still > 60 s; pauses ≤ 0.2 s.
- A new framing every ~0.8–1.2 s; whips between quick inserts; fov "punch" (snap zoom −4°) on accent words.

**Camera (the user loved these: use them OFTEN)**
- **The smooth room orbit:** inside a place the camera glides around the character in one continuous arc (the v03 top-floor
  360°), showing the character, the effect (dust, sparks, fire) and the key prop (candle) in one move. Build keys from the
  character's facing (`CF(dist, side, up, from)` in v03 direction.js) so the camera always stays in front of the face.
- **Screen shake / beat on every bomb and shock moment** (`camAt` shake amplitude + fov punch): explosions, the fireball, beams
  shaking, the flash-forward. Short, strong, deterministic; it decays within ~1 s.
- Whip cuts (blur pulse + whoosh) between far places and quick inserts; designed match/flash/sepia cuts; glides only inside a place.

**Colour (perfect, keep it)**: one video-wide cool base (night navy/teal/steel, ~69% of saturated pixels) + hot accents only
(fire orange, the protagonist's red); dark cool wood/stone, no brown midtones. Check with `tools/palette_check.py`.

**Sound (now timed correctly, keep it)**: the 2026-11-23 sound editing rules above (cut to the moment, start on the hit, skip
pre-roll, no decorative noise, booms under the voice, music from frame 1 via `pieces`, flashback swell on time jumps).
- **No vocals in music or effects:** compose music with `force_instrumental`; SFX prompts say "no voice, no speech"; listen-check
  every new effect for words/voices. Human sounds (laugh, gasp) only when that character is on screen doing it. Nothing may talk
  over the narrator.

**Effects and gags**
- A red alarm glow over the whole frame (edges deep red, light wash, ~0.3 s decay) for "No/forbidden" beats, not 2D icons.
- A full-frame effect (cloud, smoke, flash) lasts ≤ ~1 s and takes the character mid-sentence; he is readable first.
- An effect never stops before its sentence ends (the chain reaction keeps burning with `hold` until the line is complete).

**Never again (glitches the user saw)**
- The camera never passes through floors, walls, props or near-lens particles (a white/glow flash for a few frames). To go
  between floors: stay below, then whip-cut. Check camera clearance on every key, especially when the subject climbs.
- No subject passes within 0.6 m of the lens; no blank frames from a camera inside a character (check every insert camera).
- A character's look never changes; a stunt double uses the same spec. Run `popscan` + a contact sheet of every cut and every
  camera move before the final render.
