# Face library (user, 2026-11-19): pick DIFFERENT faces for every video

All faces are in the locked drawing style (same canvas, brush-stroke ink recoloured warm brown in the shader, flat white face).
Each set has the full 174 drawings the character code uses (14 expressions × plain/_talk/_A/_O/_E × gaze ""/_L/_R + _blink).
Use one with `faceSet: "<name>"` in a character spec. Preview: `faces_sheet.png` (neutral, happy, smug, angry, shock, laugh).
**Rule:** don't give every character the same face; cast faces from this library per video (no two main characters with the
same face set). Add new identities in `kit/tools/face_library.py` (never edit an existing one), run it for the new names, then
`python -I kit/tools/face_index.py`, and add a row here. Video 1's faces stay as they are.

| Face set | Look |
|---|---|
| `keeper` | video 1 keeper: white cloud beard (video 1 only) |
| `engineer` | round glasses, small oval eyes |
| `folk` | plain: small oval eyes, thick brows |
| `folkb` | white cloud beard (video 1 townsfolk only; no beards on new casts) |
| `folkm` | bushy scalloped moustache, no beard |
| `lib_youngman_a` | young man, small oval eyes, thick brows |
| `lib_youngman_b` | young man, tall bean eyes, arched brows, freckles |
| `lib_toughguy` | tough guy, beady eyes, heavy unibrow, stubble |
| `lib_nerd` | nerd, small oval eyes behind big round glasses, thin brows |
| `lib_sleepy` | tired guy, droopy eyes with bags, flat brows |
| `lib_woman_a` | woman, lashed oval eyes, thin arched brows, blush |
| `lib_woman_b` | woman, big lashed round eyes, thin brows, freckles |
| `lib_woman_glasses` | woman, lashed eyes, arched brows, square glasses |
| `lib_oldwoman` | old woman, small lashed eyes, thin brows, wrinkles, round glasses |
| `lib_pencil` | man with a thin pencil moustache, thin brows |
| `lib_goatee` | man with a goatee, beady eyes, thick brows |
| `lib_shortbeard` | man with a short trimmed beard, oval eyes |
| `lib_oldman_moustache` | old man, bushy brows, bushy scalloped moustache, wrinkles |
| `lib_oldman_handlebar` | old man, handlebar moustache, bushy brows |
| `lib_kid_a` | kid, big round eyes, thin brows, freckles, small mouth |
| `lib_kid_b` | kid, big lashed eyes, rosy cheeks, small mouth |
