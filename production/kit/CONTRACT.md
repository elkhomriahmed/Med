# Shorts kit: code-only 3D pipeline (three.js + Remotion)

Reusable for every future video: new places and characters are new *specs/builders*, not new tools.
Style rules: `../STYLE_BIBLE.md` (v12 LOCKED + 2026-11-16 additions). Target look: `../look_dev/STYLE_v12_LOCKED_reference.png`
and the approved animated sample `../videos/00_tests/t15_threejs_v12_beams.mp4` (made with Blender-exported models; we now build everything in code).

## Folders and owners (never edit another owner's folder)
| Folder | Owner | Exports |
|---|---|---|
| `shared/` | integrator | `assets.js` (loadTex, loadPBR, loadGLTF, INK, SKIN, rng, url) |
| `characters/` | characters agent | `index.js` → `createCharacter(spec)` |
| `world/` | world agent | `index.js` → reusable set builders + `buildLampRoom()`; `look.js` → `createLook(...)` |
| `timeline/`, `samples/` | integrator | Remotion compositions, audio, captions, camera |
| `public/faces` (read-only), `public/audio`, `public/sfx`, `public/music` | integrator | |
| `public/tex`, `public/models`, `public/hdri` | world agent | downloaded CC0 assets (Poly Haven, ambientCG) |
| `public/chars` | characters agent | any character textures |

Each agent tests with its OWN Remotion entry (`<folder>/test/index.js` + its own Root) and renders into `<folder>/out/`:
`npx remotion still <folder>/test/index.js <CompositionId> <folder>/out/x.png --gl=angle` (run from `production/kit`; GPU = Intel Iris Xe via ANGLE/D3D11).
Versions are pinned: three@0.170.0, postprocessing@6.36.4, n8ao@1.9.4, remotion@4.0.544, react@18.3.1. Plain JS/JSX, no TypeScript.
Scale: 1 unit = 1 m, Y up, floor y = 0. Canvas 1080×1920, 30 fps. Frame budget ≤ 0.5 s on this GPU.

## API: characters/index.js
**The look is locked (`../visual_library/CHARACTER_LOCK.md`): never change proportions/outline/face/limbs here; new people = specs.**
```js
const ch = await createCharacter(spec);
// spec: { id, faceSet: "keeper"|"engineer"|"folk"|"folkb", seed,
//         coat: { type: "knit"|"check"|"tweed"|"plain"|..., color, accent, shirtPanel?: color },
//         hat: null|"beanie"|"cap"|"bowler"|..., hatColor, hair: null|{ color }, accessory?: "glasses"|... }
ch.root            // THREE.Group, origin = floor between the feet, character faces +Z. Place/rotate this only.
ch.update(state, { camera, keyLightPos /* world Vector3 */, time })   // call every frame BEFORE rendering
// state: { expression: "neutral"|"smug"|"happy"|"laugh"|"shock"|"skeptical"|"proud"|"worried"|"angry"|..., gaze: ""|"_L"|"_R",
//          mouth: ""|"_A"|"_E"|"_O"|"_talk"|"_blink",
//          armL / armR: { pose: "rest"|"hip"|"wave"|"thumbChest"|"shrug"|"fold", target?: THREE.Vector3 (world point to point at / grab) },
//          lean, side, turn, nod, tilt (radians, small), bob (m) }
ch.headCenter()    // world Vector3 (for camera framing)
ch.handWorld("L"|"R")  // world Vector3 of the finger hook (props attach here)
```
Faces: `public/faces/<faceSet>_<expression><mouth><gaze>.png` (fall back by dropping gaze, then mouth). Mouth inside is black.

## API: world/index.js and world/look.js
```js
const place = await buildLampRoom();   // also: reusable builders for future places (rooms, floors, walls, windows, props, skies)
place.group; place.keyLightPos; place.anchors /* { lens, keeperSpot, engineerSpot, ... } */; place.update(time)
const look = createLook(renderer, scene, camera, W, H, opts);   // post chain (AO, bloom, grade, vignette, DOF); look.render()
```
