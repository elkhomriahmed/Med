# Production time: three.js + Remotion + CC0 libraries + agents

Measured on the user's laptop (Intel i5-1135G7, Intel Iris Xe via ANGLE/Direct3D11), 2026-11-16, with the
`samples/keeper_laughs` sample (lamp room, keeper + engineer, 1080×1920, 30 fps).

## Per frame (measured)
| Step | Time |
|---|---|
| Characters update (both) | ~0.001 s |
| World + lights + shadows + post (AO, bloom, grade, SMAA) | ~0.17 s |
| **Total per frame** | **~0.17 s** |
| Fixed setup per render (bundle code, copy `public/`, build scene) | ~20 s |

## Render (measured / predicted)
| | Frames | Time |
|---|---|---|
| Sample, 6.4 s (measured) | 190 | **52 s** + ~3 s audio mastering (`timeline/finish.sh`) |
| Full video, 62 s (predicted) | 1,871 | **~6 min** (20 s + 1,871 × 0.17 s) |
| For comparison: Blender Cycles (old, measured) | 1,871 | ~125 h (~240 s/frame) |

Frame cost will rise with richer scenes (more props, motion blur, more characters), estimated up to 0.2–0.4 s → full video still < 15 min.

## Whole process per full video (predicted, kit already built)
| Step | Who | Time |
|---|---|---|
| Script + shot list | Claude | ~10 min |
| ElevenLabs voice (house voice) + word timing | ElevenLabs + Whisper | ~5–10 min |
| New places / characters (reusing the kit) | agents in parallel, own folders | ~20–40 min (0 if reused) |
| Word-keyed acting + camera direction for every line | Claude | ~20–30 min |
| Low-res still checks + fixes | Claude | ~15–20 min |
| Final render + −14 LUFS mastering | Remotion + ffmpeg | ~6 min |
| **Total** | | **~1.5–2 h** (≈1 h when places and characters are reused) |

**These are predictions from one 6.4 s sample, not measured full videos.** While making every video (user, 2026-11-17):
report the time used and the time left after each step; warn the user right away when a step runs past its target; never
lower the quality to save time without asking; and log the real time of every step below when the video is done.

## Measured full videos
| Video | Script + shot list | Voice + timing | Places + characters | Direction | Checks + fixes | Render + master | Total |
|---|---|---|---|---|---|---|---|
| 01 Lighthouse (2026-11-17, 64.0 s, 28 shots, 6 places, 9 characters) | ~4 min | ~3 min | ~45 min wall (4 agents in parallel; first full world: lamp room fixes, exterior, town, cast) | ~25 min | ~75 min (6 low-res whole-video renders + spot renders) | ~7 min (5.9 min render + mastering) | **~2 h 25 min** (+ ~10 min sound: 41 ElevenLabs sounds + pre-mix) |

## What building the sample actually took (one-time kit cost)
| Step | Time |
|---|---|
| Characters agent (`characters/`) | ~15 min, in parallel with ↓ |
| World + look agent (`world/`, Poly Haven assets 44.7 MB) | ~20 min |
| Timeline (VO speed-up, captions, SFX, music, camera, acting) | written while the agents worked |
| Integration + 3 still-check rounds + 2 renders | ~15 min |
| **Total for the kit + sample** | **~35–40 min** |

### Lessons from video 1 (use them to stay near 1.5 h next time)
- A low-res check render of the whole video (540x960) takes ~5 min; full 1080x1920 takes ~6 min (0.18 s/frame incl. post). Check with
  contact sheets of every shot + `tools/popscan.py`, not single stills (each still rebuilds the world: ~60 s).
- Most fix rounds were camera framing in the small lamp room (radius 2.9 m): use the distance-framed keys (`F(...)` in direction.js),
  keep everyone >= 1.05 m from the lens axis (basin lip 0.89 m), and turn characters so the working hand faces the camera.
- Flights: always leave/enter the lamp room through the front window keys (inWin/outWin), add a waypoint that rises clear of nearby
  characters/rocks before long flights, and use monotone camera tangents (timeline/camPath.js) so far keys never cause overshoot.
- Render with `--timeout=300000` (building the world takes > 30 s).
