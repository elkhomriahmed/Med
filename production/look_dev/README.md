# Look development

## v2 (current): `production/pipeline/`
- `toon.py`: shared toolkit (materials, ink lines, lights, render settings, glow pass)
- `faces.py`: draws 8 expressions per character (smug, happy, neutral, shock, angry, worried, laugh, sleepy)
- `characters.py`: 3D characters (shaded sphere head, bean body, 3D clothes and hats, thin ink limbs, cast shadows) with a drawn face that always faces the camera
- `sets/cottage.py`: lighthouse keeper's cottage built board by board, plus props and lighting
- `look_test.py`: renders the test shots. Settings come from environment variables (SHOT, KF/EF faces, PCT, SAMPLES, KEY, FILL, FRONT, EXPO, SAT, SLINE, CLINE)

Renders: `renders/comparison_v2.jpg`, `renders/v2_wide.png`, `renders/v2_close.png`.

## v1 (rejected)
Flat card characters in a simple room: `scene.py`, `chars.py`, `renders/comparison.jpg`.
