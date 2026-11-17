# Video 1 world layout (integrator, 2026-11-17): ONE connected world

Units: metres, Y up. Every place below lives in the same scene at these exact coordinates so the camera can fly between them.

| Place | Owner / folder | Where |
|---|---|---|
| Lamp room (exists) | lamp-room agent: `world/lampRoom.js`, `world/fx.js`, `world/props.js`, `world/materials.js`, `world/look.js` | Floor y = 0, centre (0,0,0), radius 2.9; lens at (0,0,-0.3). Gallery deck outside the windows, railing radius 3.85 |
| Tower, rock, sea, sky, jetty, ships, boats, gulls, snow | exterior agent: `world/exterior/` (new) | Tower from just below the gallery (y ≈ -0.6) down to the rock top at y = -30, radius 3.3 at top → 4.2 at base, white with a red band. Rock island top y = -30, radius ~18, cliffs down to the **sea at y = -34** (real water plane, ≥ 3 km wide). **Jetty** on the +Z side: from the rock edge (z ≈ +16) out to z ≈ +30, deck at y = -33.2 |
| Harbour town | town agent: `world/town/` (new) | Across the water on +Z: town square centred at **(40, -34, 300)**, quay along z ≈ 280 facing the lighthouse (-Z). Ground at y = -33 (quay top) |
| Characters | characters agent: `characters/` | placed by the integrator |
| Shots, camera, acting, sound | integrator: `videos/v01/` (new) | |

Sky: ONE sky dome for the whole world, owned by the exterior agent, radius ≥ 1500 centred on (0,0,0). `buildLampRoom({ exterior: false })` must skip its own tower stub and sky so the exterior's are used.

Times of day every builder supports with `setTime(name)` (lights, sky, window glow, lamp on/off), switchable per frame without rebuilding:
`"night"` (main: moon + warm lamp/beams), `"dusk"`, `"morning"` (lamp off, warm low sun through the windows), `"winter"` (night or grey day + snow on the gallery, railing, rock, roofs).

Every builder returns `{ group, anchors, update(t, camera), setTime(name), lights }`. Anchors are world-space `THREE.Vector3`s the integrator uses for camera framing and character placement. Keep frame cost low: the whole world must render at ≤ 0.3 s/frame on the laptop GPU (Iris Xe), so use merged meshes, 1k textures, simple far detail, and let the integrator hide groups (`group.visible = false`) that the camera can't see.
