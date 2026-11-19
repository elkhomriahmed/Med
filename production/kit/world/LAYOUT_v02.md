# Video 2 world layout (integrator, 2026-11-19): ONE city block, Pittsburgh, April 1995

Units metres, Y up, ground y = 0. One scene; the camera flies between places. Read CLAUDE.md "3D depth and texture" first:
every surface has real modelled relief, several depth layers, parallax, worn varied materials, AO in corners.

| Place | Owner / folder | Where |
|---|---|---|
| CITY_STREET (exterior) | street agent: `world/city/` (new; start from HARBOUR_TOWN techniques, then upgrade) | Street along X from x = -40 to +60: road z -5..+5 (asphalt, lane lines, manhole, puddles), kerbs, sidewalks to z ±8.5, parked 1995 cars, lamp posts, hydrant, newspaper box, trash cans, street trees. **North side** (facades at z = -8.5, facing +Z): APARTMENT building x -7..+7 (3 floors, brick, fire escape; his window = 2nd floor centre, sill at y 4.0, x 0), shops either side, POLICE STATION x +22..+34 ("POLICE" sign, blue lamps, steps). **South side** (facades at z = +8.5, facing -Z): BANK 1 "FIRST CITY BANK" x -4..+8 (columns, glass doors at x 2), shops, BANK 2 "PEOPLES SAVINGS & LOAN" x +14..+24 (glass doors at x 19). Distant buildings/hills beyond both ends for depth |
| APARTMENT interior | interiors agent A: `world/apartment/` | Inside the apartment building, floor y = 3.6, room x -5..+5, z -9..-15 (window wall at z -9 = the street facade, his window at x 0). Kitchen half (x -5..0): counter, sink, fridge, table with lemons; living half (x 0..+5): couch, CRT TV on a stand facing the couch, front door on the back wall (z -15) with frosted glass |
| BANK interior (×2 instances) | interiors agent B: `world/bank/` | `buildBank({ name, palette })` placed behind each bank facade: bank 1 interior x -4..+8, z +8.5..+22; bank 2 x +14..+24, z +8.5..+20. Teller counter with glass, marble floor, rope line, desk, ceiling security camera in a corner (anchor + its view), wall clock, posters |
| POLICE interior | interiors agent B: `world/police/` | Behind the police facade x +22..+34, z -8.5..-22: front desk (newspaper on it), interrogation room (table, 2 chairs, TV + VCR on a cart, one-way mirror), cell block (bars that slide) |
| PROFESSOR'S OFFICE (Cornell, far away) | interiors agent A: `world/office/` | Separate place at origin (500, 0, 500): book-lined office, desk with lamp + newspaper + textbook, big green chalkboard (writable: text/graph shown by a 0..1 reveal control), window with evening campus |

Times of day every builder supports with `setTime(name)`: `"morning"`, `"day"`, `"night"` (`"evening"` for the office). Switchable per frame.
Each builder returns `{ group, anchors, update(t, camera), setTime(name), lights }` with world-space anchors (character spots,
camera views, prop spots, door/window positions). Frame budget for the whole world ≤ 0.3 s/frame on the Iris Xe: merged meshes,
instancing, 1k textures, few real lights (emissive for windows/signs), let the integrator hide groups the camera can't see.
Palettes (one per place, characters contrast): street = warm red/orange brick + blue sky + green trees; kitchen = teal/mint tiles
+ cream (lemon yellow as the accent); living room at night = deep blue with the TV's cold glow + one warm lamp; bank = cream marble +
deep green + brass; police = grey-blue + one warm desk lamp; office = dark wood + green chalkboard + warm lamp.
