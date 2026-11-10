# Gap analysis: the 10 competitor opening frames vs our v5 frame

Measured on all 10 frames plus ours: brightness, contrast, saturation, colour palettes (k-means), edge and texture density. Then zoomed in on faces, outlines and backgrounds (`faces_zoom.jpg`, `bg_zoom.jpg`, `palettes.jpg`).

| | Competitors (range / typical) | Ours v5 |
|---|---|---|
| Mean saturation | 73–171, typically ~125 | 107 |
| Saturation 90th percentile (the vivid accents) | 142–244, typically ~200 | 165 |
| Palette | 2 contrasting hue families + clean white + near-black | 5 browns + cream (one family) |
| Contrast (luminance SD) | 41–71 | 65 (OK) |

## Mistakes and gaps

### 1. We outline the backgrounds. They mostly don't.
- In the car, rail-building, rail-gap, oil-ship, pink-cell and jar frames, **the 3D world has no ink lines at all.** Shape comes from light, shadow, texture and reflections.
- Only the stylised "illustrated" sets (brain room, alley, Japanese room, grave) have lines. Even there the lines are thin, sit only on big shape edges, and are often coloured, not black.
- **The thick black ink belongs to the characters only.** That contrast between drawn characters and a lit 3D world is the core of the look.
- **Fix:** no set ink by default; an optional thin coloured line on major edges for "illustrated" locations.

### 2. Colour is muddy and single-family.
- Our palette is brown, brown, brown, cream.
- Theirs always pairs **two contrasting families**: blue sky and red/yellow seat; blue sky and yellow/denim; deep blue night and a warm lamp; red canyon and a blue-black train; purple and orange.
- They also keep **pure, clean colours**: saturated blue skies, red fabric, yellow clothes, no grime wash over everything.
- **Fix:** each location gets a 2-family palette (one dominant, one accent), cleaner albedos, and much less grime.

### 3. Our surfaces are all matte. Theirs have materials.
- What makes their worlds read 3D: **specular highlights and reflections** (chrome pedals, glossy rails, metal balls, pot rim, phone screen), **real material contrast** (stitched leather seats, pebbles, fabric weave, glass), **hard sun shadows**, **atmospheric haze** in the distance, **light shafts** (pink cell) and **depth of field**.
- Our baked lighting is diffuse only, and the fast renderer adds no shine, so everything looks like painted clay.
- **Fix:**
  - add a cheap view-based specular/reflection layer on top of the baked set
  - give each location 2–3 hero materials (metal, glass, glossy paint)
  - stronger sun shadows, distance haze, light shafts, and real depth of field on close-ups

### 4. Characters (design is locked; these are polish items, not redesigns)
- **Outline:** theirs is **hand-drawn**, slightly uneven in thickness and a little wobbly. Ours is a uniform, machine-clean line.
- **Heads:** theirs are near-flat white with very soft painted shading and no glossy highlight. Ours are a little too "CG sphere" (gradient plus shine).
- **Faces:**
  - Features are **smaller** and **shifted toward where the character is looking** (a three-quarter face). They're usually **asymmetric**: one brow up, a smirk to one side.
  - Ours are centred, symmetric and a bit big and geometric.
  - Their moustaches are small; our keeper's beard cloud is too big and reads as a sticker.
- **Clothes:** drawn details such as stitches, pockets, zippers, belt buckles, overall straps and badges. Ours are plain blobs.
- **Limbs:** thin uniform lines; feet are small, or just the line end with a tiny shoe. Our round shoes are too big and shiny.

### 5. Composition: our frame is static and empty.
- Every competitor opening frame shows **the hook action**: driving, hammering, painting, pouring, sawing, lying in a coffin, falling through a ceiling, holding steel balls, touching the dragon jar.
- The character **interacts with a big prop**.
- There's a **big foreground object** for depth (seat, rail, pot, pebbles), a mid-ground character, and a lit or hazy background.
- Low or high camera angles, often a wide lens close to the subject.
- Our frame is two characters standing frontally, side by side, doing nothing, with nothing in the foreground.
- **Fix:** every shot gets foreground / character / background layers, an action pose with a prop, and a dynamic angle.

### 6. Light tells you where you are.
- One strong, motivated key light per frame: a sun shaft, a lamp, a single bulb, a window beam. Then a clear colour grade, e.g. all-blue night or warm interior.
- Glow on lamps.
- **Fix:** one key per shot with visible shafts or pools, the rest of the frame lower.

## What we already match
- Character construction: big white head, bean body, stick limbs.
- Drawn faces and expression range.
- Caption style.
- Real 3D sets with depth.
