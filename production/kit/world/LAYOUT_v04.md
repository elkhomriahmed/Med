# Video 4 world layout (integrator, 2026-11-23): an office parking lot at sunny noon

Story: `production/videos/04_water_bottle_car/script_v1.md`. Units m, Y up, asphalt y = 0. One place cluster.

## Colour scheme for the WHOLE video (STYLE_BIBLE "VIDEO 3 FORMULA")
- Cool base (≥ 60% of saturated pixels): deep summer sky blue #3f86d6 → #9cc8f0, cool grey asphalt #4a5058 / #6b7178, teal/blue
  cars #2f7f8f #2c5f9e, steel-blue glass with sky reflections, cool concrete #8a929c, dark green-teal trees #2e5a4e.
- Accents only: the burning dot (white-hot core → orange #ff9a2a), the fire, the new guy's red shirt, small red details
  (a stop sign, the car's tail lights). The hero car is WHITE-silver (#e8edf2) so the dark seat + dot read through the glass.
- Noon sun: strong, high, slightly from +z/−x (front-left); crisp short shadows; a visible sun disc + lens glint in the sky.

## Lot + building (agent A: `world/lot/`)
- Office building facade along z = −14, facing +z: 3 storeys (y 0..11), cool concrete + blue glass curtain bands, entrance
  doors at x 0, an upstairs office window at x −3, y 4.2..5.8 (2nd floor) with a shallow lit office room behind it (desk,
  plant, blinds half up) where the coworker stands (`coworkerSpot`), visible from the lot.
- Parking lot z −11..+12, x −14..+14: painted bays, kerbs with height, a few parked cars (cool colours, varied), lamp posts,
  trees with shade islands, a stop sign, heat shimmer in the distance (optional), far skyline/hills for depth.
- Hero bay: the hero car parks nose-in toward the building at (2.5, 0, −4.0), facing −z.
- Stairwell (separate small interior at (60, 0, 0)): concrete stairs going down, handrail, wall signs, a fire door with a
  window; lit by cool fluorescent light + a sunny window. Anchors stairTop/stairBottom + 2 views.

## Car + FX (agent B: `world/car/` + `world/fx_v04/`)
- Hero car (white-silver compact sedan) with full interior seen through clear glass: dark charcoal leather driver seat, wheel,
  dashboard, door panels. Driver door opens (`set({ door: 0..1 })`). Windows closed and glassy (sky reflections, not opaque).
- Bottle prop: clear plastic water bottle (label ring), lying on the driver seat, rocking `set({ rock })`.
- Burn FX on the seat (all deterministic `set(k, t)`): focused white-hot DOT (small, dancing with the bottle), thin SMOKE
  thread, black SCORCH spot growing, glowing orange RING (ember edge), FIRE burst; heat haze inside the car (oven).
- Optics macro stage at (300, 0, 300): a big bottle in sunlight, light rays as visible shafts entering the curve and bending to
  one point on a leather swatch; a coin beside the spot for scale; leather scorching, a plastic cap melting, foam glowing.
