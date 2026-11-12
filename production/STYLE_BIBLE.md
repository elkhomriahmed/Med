# STYLE FORMULA v10 (current — overrides anything below that conflicts)

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
