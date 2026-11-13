# Scorecard: lighthouse_mercury_v11.mp4 vs 13 competitor shorts

## Measurements (all frames scaled to 360x640, 6 samples/s)

| Metric | Ours | Competitor median | Competitor range | Verdict |
|---|---|---|---|---|
| Duration (s) | 62.4 | 63.2 | 39–67 | match |
| Hard cuts per 10 s | 2.41 | 2.47 | 1.27–3.47 | match |
| Camera/image motion | 3.18 | 2.72 | 1.86–3.15 | highest of all 14: too restless |
| Saturation | 0.463 | 0.456 | 0.375–0.648 | match |
| Colourfulness | 65.9 | 73.0 | 42.6–91.4 | a little low |
| Brightness | 0.515 | 0.596 | 0.341–0.723 | darker (night story; their night videos sit at 0.54–0.68) |
| Share of dark pixels | 21% | 11% | 5–43% | at the high end |
| Contrast (luma std) | 0.258 | 0.200 | 0.183–0.230 | above every competitor: too hard |
| Fine texture detail (Laplacian var) | 501 | 1600 | 975–2800 | lowest of all 14 (about 1/3 of median) |
| Loudness (LUFS) | −14.9 | −14.0 | −14.1 to −14.0 | 0.9 dB too quiet |
| Loudness range (LU) | 1.4 | 2.2 | 1.7–3.5 | flatter |
| Voice pace (words/s) | 3.23 | 3.83 (Mirror) | | slow; 9 pauses > 0.3 s (max 0.49) vs 6 (max 0.34) |
| Sound effects | 93 events, 16 sounds | effect on almost every action | | ok, low variety |
| Places | 5 (lamp room ~80% of runtime) | 6–9, none dominant | | too much time in one room |

## Feature scores (same weights as the v8 scorecard, which totalled 63%)

| Feature | Weight | v8 | v11 |
|---|---|---|---|
| Character shape | 8 | 85 | 85 |
| Face rendering | 10 | 65 | 85 |
| Expressions + lip-sync | 10 | 75 | 82 |
| Body acting | 10 | 65 | 70 |
| 3D world | 15 | 50 | 55 |
| Post / grade | 8 | 80 | 72 |
| Camera + transitions | 10 | 50 | 68 |
| A picture + gag for every line | 10 | 45 | 55 |
| Voice pace | 7 | 70 | 70 |
| Sound | 7 | 50 | 65 |
| Captions | 5 | 90 | 90 |
| **Overall** | 100 | **≈63%** | **≈71%** |

## Biggest gaps, by impact
1. World detail and variety: texture detail is a third of theirs, and ~80% of the runtime is in the lamp room.
2. Framing: we crop heads in close-ups and rarely show full bodies in wide shots. They keep the whole character in the frame,
   at 40–60% of its height, with the world around them.
3. The lens blows out to a flat white blob (0–4 s, 46–54 s), which is also why our contrast is the highest.
4. Voice: 3.23 words/s against 3.83. Needs the new recording.
5. Camera moves more than in any competitor video. Hold shots longer and move more slowly.
6. Master 0.9 dB louder (to −14.0 LUFS) and add more sound variety.
