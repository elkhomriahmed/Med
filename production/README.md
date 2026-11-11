# Production

| Folder | What it holds |
|---|---|
| `STYLE_BIBLE.md` | The locked style rules: characters, places, light, camera, captions, sound |
| `pipeline/` | The engine: scene tools (`toon.py`), characters and faces, sets, lighting bake (`bake.py`), parallel frame rendering (`render_range.py`), captions + sound + encode (`fastfinish.py`). `sample5b.py` is the working reference scene. `archive/` holds old test scripts |
| `videos/` | One folder per video: script, voiceover timings, scene file, final MP4 |
| `samples/` | Test clips (v11 is the approved 5-second sample) and review notes |
| `look_dev/` | Still frames and comparisons from developing the look |
| `scripts/` | Short test scripts |

`../analysis/` holds the competitor study (style breakdown, transcripts, the tutorial breakdown).

Not stored in git (too large; they live on the render machine): Blender itself, the speech-timing model, and rendered frames.
