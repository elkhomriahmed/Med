# Style v12 in three.js — live-light test (no pre-computed lighting)
Rebuilds the LOCKED v12 frame with three.js real-time lighting to compare against `../STYLE_v12_LOCKED_reference.png`.
1. `python export_scene.py OUT/assets` (Blender as Python module) — exports surfaces only: colour, relief (normal map), glow; no light.
2. Serve a folder containing `index.html`, `main.js`, `assets/`, `node_modules/` (three@0.170.0, postprocessing@6.36.4, n8ao@1.9.4).
3. `node render.mjs ROOT out.png "tm=ACES_FILMIC&kpt=0.008&kfill=25&hemi=1.3&sat=0.12&face=0.95&kbounce=14"`
Result (cloud, software WebGL, 1080x1920): ~2.5–2.7 s per frame after the first; export 2 min once.
Known gaps vs locked: no light bounce (ceiling flat/brown), no soft shadow pools, limbs too thick (outline on thin tubes),
lens glow weaker, engineer's mouth loses its red. Point-light shadows fail in software WebGL → lamp shadow from a spotlight.
