# Video 3 world layout (integrator, 2026-11-23): an 1870s flour mill on a river, at night

Story: `production/videos/03_flour_mill/script_v1.md`. Units m, Y up, ground y = 0 at the mill door. One place cluster.

## Colour scheme for the WHOLE video (STYLE_BIBLE 2026-11-23 D)
- Base (≥ 60% of saturated pixels): cool night navy / teal / steel blue: #0f1b2e, #142238, #1f4a5a, #2c5f73, #3a5a7a; moonlight #9fb8ff.
- Wood and stone are COOL and dark (desaturated grey-brown / blue-grey): #2e2c2b, #3b3631, #4a4540, #5a5f66. No orange/brown midtones.
- Accents only: candle / fire #ff9a2a, #ffcf5a; the new guy's red scarf #d8322a; warning sign red #c22a22.
- Flour = bright warm-white highlights #f3efe6 (sacks, dust on beams, haze).

## Mill (agent A: `world/mill/`)
- Footprint x -5..+5, z -4..+4, stone/brick ground floor walls, timber upper storey. Door on the -z side (x 0).
- Ground floor y 0..3.4: millstones on a timber platform, sack piles, chutes/hoppers from the ceiling, a wooden wall at
  x -4.6 (inside) where the NO FLAMES sign goes, a staircase/ladder at x +3.5 z -2.5 rising to a hatch in the top floor.
- Top floor (attic) floor y 3.6: open floor under a pitched roof (eaves ~5.6, ridge ~7.8, ridge along x), heavy rafters, tie beams
  and posts (the beams that shake), thick white flour dust lying on every beam, sacks, a hopper. A river-facing window in the +z
  wall at x -2.5 (sill y 4.4, 1.0 w × 1.2 h): the new guy flies out of it.
- Windows everywhere let cool moonlight in (visible key light). Night is the main time; also a cool overcast "day" for the
  foreman's rule beat.
- Breakaway for the big blast: `mill.set({ blast: 0..1 })` (pure function): roof panels launch up and spin, upper walls fold
  OUTWARD at their base like cardboard, window glass gone; `mill.set({ shake: 0..1, t })` rattles beams/posts deterministically.
- River on the +z side: bank wall at z ≈ +5, water y ≈ -1.2 from z +5.5 to +25 (reuse/vary SEA: calmer, river-like), a small
  water wheel on the +x wall, a stone bridge and a far town skyline across the river (silhouettes, lit windows) for depth;
  night sky + moon (reuse `createExteriorSky`).

## FX (agent B: `world/fx_v03/`)
Candle prop with a living flame + point light; flour haze; spark swirl; rolling fireball along a path; dust pouring off beams;
white-out cloud; macro "science" stage (flour pile, specks with oxygen halos, chain reaction) at (300, 0, 300); big explosion
(fire + white plume + debris); river splash; all deterministic `set(k, t)`.

## Characters (integrator)
New guy (protagonist), foreman, one co-worker: specs in `characters/specs.js` per `visual_library/CHARACTER_LOCK.md`.
