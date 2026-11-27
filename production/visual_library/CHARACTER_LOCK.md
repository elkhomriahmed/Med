# CHARACTER LOCK: the approved look, extracted (user, 2026-11-23)

**Look at `CHARACTERS_LOCKED_reference.jpg` first.** Every character in every video must match it. The look is DONE: a new video
never redesigns a character, never "improves" shapes, never builds a person any other way. In video 2 shapes were changed (TV and
newspaper people drawn as simple placeholders, beards, the same face on everyone, unclear pupils) until the user stopped it, which
wasted time and usage. Do not repeat that.

## 1. What is locked (never change; lives in `kit/characters/index.js`, do not edit its geometry)
| Part | Locked value |
|---|---|
| Head | white sphere R 0.29 m, sitting 0.76 R above the torso top, 10 cm toward the camera; no neck, no collar |
| Face | flat WHITE (0.97,0.965,0.95) 2D drawing projected from the camera; features always centred; gaze by pupils only (`_L`/`_R` drawings, driven by `lookAt`); open mouth inside BLACK |
| Outline | hand-drawn wobbly marker ring 2.2 cm, bites 1–13%, full circle including the chin; constant every frame |
| Ink | warm dark brown (0.11,0.075,0.06) for outline, limbs, face lines; never navy/black |
| Torso | slim capsule: half width 0.21, depth 0.15, height 0.31, taper 0.06, profile \|t\|^3.2 |
| Arms | ink tubes r 1.5 cm, 0.27 + 0.27 m, 2-bone IK; hand = arm line ending in a 4.5 cm finger hook (r 1.75 cm). No balls, mittens, fingers |
| Legs/feet | ink tubes 0.365 + 0.365 m; feet = a ~10 cm forward "L" stroke. No boots, no shoes |
| Behaviour | ONE PIECE (no lag between parts, nothing pops); no limb through the body; `update()` is pure (state, camera, light) |

## 2. What changes per video (ONLY through a spec in `kit/characters/specs.js`)
- `faceSet`: a different identity per main character from `visual_library/FACES.md` (no two mains share one). New identities only
  with `kit/tools/face_library.py` + `face_index.py`, drawn in the SAME line style. **No beards** on new casts unless the story needs
  one (moustache set `folkm` exists).
- `coat`: type (knit / check / tweed / stripes / plain / jersey), colours, accent, panel, buttons, zip, badge, tie, bowtie, stripes.
  Clothes colours follow the video's colour scheme (the protagonist's colour is the brightest thing in frame).
- `hat` / `hair` (beanie, captain, sailor, beret, oilskin, toque, bonnet, cap, backcap, police; hair bowl/short/slick/bun/professor/bob),
  `accessory` (glasses), `scale` (kids 0.75), `seed` (outline wobble).
- One signature item per character, readable across the room.

## 2b. A character's look is FIXED for the whole video (user, 2026-11-23)
Clothes, colours, hat, hair and face set never change between scenes, not even "because he got covered in flour/mud/water".
Video 3 swapped the new guy's red jumper for a white "powdered" version in the river scene and the user rejected it: the viewer
must recognise the same person in every shot. Story effects (dust, wet, soot) are shown with effects AROUND or ON TOP of the
character (particles, drips, a light overlay), never by changing the spec. A second rig of the same person (for a stunt) uses
the SAME spec.

## 2c. Back view (2026-11-23)
When the camera is behind the body (past ~95°), the face drawing fades out and the back of the head (hair/hat) shows. Never a
face on the back of a head. `state.backView: false` forces the face (rare).

## 3. How every person on screen is made
- **Live in the scene:** `createCharacter(SPECS.x)`. Acting = state (`expression`, `mouth`, `lookAt`, arm poses via `armAt`, `sit`, `bob`, `nod`).
- **On a TV / CCTV / photo / newspaper / book / poster:** a REAL render of a spec through the mini renderer (render target → canvas
  → texture), as in `kit/videos/v02/Video.jsx` (`buildMini`, selfie, mugshot capture). Never a drawn placeholder figure.
- **Crowds:** several specs with small colour/face changes; same body.
- New pose needed? Add a named case to the pose switch (like `readNewspaper`, `selfie`) with parameters; never change shared
  proportions to make one pose work.

## 4. Before any shot is built: the 2-minute character check
1. One low-res still per character (`npx remotion still … V0NLow`) next to `CHARACTERS_LOCKED_reference.jpg`: same head size ratio,
   outline, white face, capsule, hooks, L feet? Different faces? No beard? Pupils readable?
2. Eye-lines set (`lookAt`) for every character in every beat.
3. Held props ≥10 cm in front of the face; seated people framed 3/4 so knees and feet read.
If something looks off, fix the SPEC or the direction, never the locked geometry.

## 5. Agent rule
Agents that touch characters get this file + the reference image in their brief and may only add/modify specs, face-library
identities and named poses. A brief that asks an agent to "make characters" without this file is wrong.

## 2d. Cast by role + glowy faces (user, 2026-11-27)
- Each character's face features and clothes are chosen from their role and situation in the story (who they are must read at a glance).
- Faces are never dry/matte: a slight glowy, luminous quality (soft inner brightness, gentle sheen on the lit side), like the competitor's characters.
