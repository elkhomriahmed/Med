# Audit of lighthouse_mercury_v11.mp4: the user's two buckets (smoothness, real-life logic)

Every claim below was checked against the frames, the render code, or measurements of the 13 competitor shorts.

## Bucket 1: smoothness
| Claim | Verdict | Evidence | Cause |
|---|---|---|---|
| Hands disappear while talking or expressing | TRUE | 14–24 s: the keeper's arms vanish for whole stretches (19.3–19.7 s); the engineer's arm goes behind his body (14.7–16 s) | Hands are tiny black balls (r=0.029) on 0.012-wide ink lines, invisible against dark coats and night. "body" arm targets sit almost inside the torso, so hands hide behind it |
| Camera less smooth, especially between places | TRUE | Jerk 0.148 vs competitors 0.066–0.130 (all smoother). Dissolves between places ghost two keepers on top of each other (40.3 s). 39.2 s: the camera dives to the rug and cuts off the head. 58.5 s: the camera exits through a blank wall. 61.3 s: a white slab crosses the frame | `camstate` eases in and out on every key, so speed drops to zero at each of 59 keys (about once per second). Places are joined by dissolves, not flights |
| Beam doesn't come from inside the lens | TRUE | 59–60 s: flat white wedges start at the edge of the lamp house; the light source itself isn't glowing | `light_beam` starts at r0=3.05 (the window radius), with flat unlit bands, no glow at the source and no falloff |

## Bucket 2: real-life logic
| Claim | Verdict | Evidence | Cause |
|---|---|---|---|
| Faces flat and white at night | PARTLY | Brightness matches the competitors: face 0.84 vs 0.78–0.89, face/frame 2.62 vs 2.41–2.75. But the light direction and colour don't match the scene: ours is the most blue-tinted of all (0.085) and less saturated (0.13 vs up to 0.23) | The head shading is baked with one fixed light (upper left) in every scene, so the side facing the lamp is never warm. The scene tint is uniform |
| Reactions too exaggerated | TRUE | 44 of 119 expression keys (37%) are laugh, shock, scream, furious, evil or angry. In B1 the keeper is wide-eyed the entire time | Default expressions are set to peak reactions; theirs default to calm (half-lidded, smirk, side-eye) and only peak briefly |
| Camera too close; characters fill the screen | TRUE | Head width is 37.5% of the frame width (median) vs 21% for competitors (range 14–35%); 90th percentile 81% vs 23–71%. The previous version was 15% | Lens and distances chosen for close-ups; most shots are medium close-ups |
| Face features show over or through the hat when looking down | TRUE | 37.7–40.2 s: the eyebrows ride up onto the brim | The face is a flat disc 1.02R in front of the head and turns toward the look target on its own. When the head tilts down, the disc sticks out past the beanie cuff |

## Points the user didn't list
1. Dissolves between places produce double exposures (ghost characters).
2. Shots blocked or pointed at nothing: rug foreground (39.2 s), blank wall (58.5 s), beam slab (61.3 s).
3. The night exterior is one flat blue (58–62 s): fog turns the white tower blue, with no warm windows or contrast.
4. The lens blows out to a white blob (0–4 s, 46–54 s).
5. Hands have no shape (balls), so they can't grip props; the competitors use small mitten hands.
6. Voice pace is 3.23 words/s vs 3.83 (old recording).

## Fixes
- Hands: mitten hand mesh (palm + thumb) at about 2.2x size, coloured with a lighter ink outline; arm targets pushed 0.08–0.12 forward of the torso; a visibility check that moves a hand forward when it's hidden behind the body.
- Camera: replace per-key easing with one continuous spline (Catmull-Rom) per shot, easing only at the start and end of each shot, with holds of at least 1.2 s; limit speed and acceleration; continuous flights between places (out the window, over the sea or town) instead of dissolves; a hard cut only when time jumps; a raycast check on every frame (no geometry within 0.6 m, both characters' heads fully in frame).
- Beam: start inside the lens (r0=0), with a glowing core, a bright halo on the lens glass and lamp house seen from outside, additive soft cones that fade with distance and at the edges, and the cone fading out before it reaches the camera.
- Face lighting: bake per scene with the real key-light direction (lamp, window or sun) plus a coloured fill from the opposite side; warm lamp side, cool night side; reduce the uniform blue.
- Expressions: calm default (neutral, half-lidded, smirk, side-eye); peaks at most about 15% of the time and under 1 s each; smaller body reactions.
- Framing: head width target about 18–25% of frame width (25–30% for dialogue close-ups, rarely); full bodies in wide shots; automatic framing from the head positions.
- Hat: draw the face on a curved patch that hugs the head sphere (a conformed decal, not a flat disc); clip the face texture above the cuff line; for nods, rotate the decal with the head instead of tracking only the look target.
