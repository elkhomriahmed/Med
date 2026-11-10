# Look development

How the competitors' look is rebuilt in Blender (rendered in the cloud, no local install needed).

- **Sets** are real 3D rooms: modelled walls, floor, beams, window, furniture. Wood and wall boards come from procedural textures. Ink outlines are drawn by Blender's Freestyle line renderer.
- **Characters** are flat drawn cards (body, head, face) that always turn to face the camera, with thin 3D ink limbs. This matches the competitors and the tutorial's diagrams. Faces are separate layers, so expressions swap without distortion.
- **Light** tells the story: moonlight through the window, a warm lamp, a blue fill.

Files:
- `chars.py` draws the character layers (heads, bodies, expressions).
- `scene.py` builds and renders the test room. Use `SHOT=wide|close`, `KFACE=` and `EFACE=` to pick the shot and the expressions.
- `renders/comparison.jpg`: competitor frames next to ours.
