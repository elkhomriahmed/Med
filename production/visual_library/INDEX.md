# Visual asset library: TEMPLATES, not a series (user, 2026-11-17)

Our videos are NOT a series: every video gets its own story, places and characters. But never rebuild from zero what already
exists here. Find the closest **template**, then change its surroundings, dressing, colours, signs, time of day and layout
so it reads as a new place. New builders made for a video are added here afterwards (name, file, what it is, how to vary it).
Code lives in `production/kit/` (paths below are relative to it). Look reference: `production/look_dev/STYLE_v12_LOCKED_reference.png`.

## Quality status (user, 2026-11-17)
Every template carries a status. **⚠ UPGRADE BEFORE REUSE** = saved as a starting point but NOT yet highly textured / realistic
3D enough (STYLE_BIBLE "3D depth and texture"). The first video that needs it upgrades it in place (same builder, same file),
the improved version REPLACES the old one, and the status here is changed to ✅ with the date. Never ship a ⚠ template as-is.

## Places
| Template name | Builder (file) | What it is | How to vary it for a new video | Status |
|---|---|---|---|---|
| **HARBOUR_TOWN** | `buildTown()` · `world/town/index.js` | Seaside town square: 6 shop/house fronts with joke signs (FISH, BAKERY, TAVERN, GOSSIP & TEA), side houses, terrace + church, quay wall onto the sea, well, lamp posts, bunting, moored boats; times night/dusk/day/morning/winter (snow) | Rename signs, recolour facades, move `TOWN_ORIGIN`, swap the sea edge for a road/field, change props. **Needs more 3D depth/texture before reuse (see STYLE_BIBLE 2026-11-17)** | ⚠ UPGRADE BEFORE REUSE: facades too flat (little modelled relief, thin depth layers); user's main note |
| **LIGHTHOUSE_EXTERIOR** | `buildExterior()` · `world/exterior/index.js` (+ tower.js, rock.js) | Striped tower on a rock island with cliffs, boulders, foam, stairs, door lantern; one shared sky dome + animated sea | Any tower/rock/island/coast; recolour the bands, change the rock height, drop the tower for a bare island | ⚠ UPGRADE BEFORE REUSE: rock reads reddish/flat in places, tower brick could use more relief |
| **SEA + SKY** | `createSea()` · `world/exterior/sea.js`, `createExteriorSky()` · `world/exterior/sky.js`, `TIMES` · `world/exterior/util.js` | 3 km animated sea with foam + highlights; sky dome with stars/moon/sun/clouds; night/dusk/morning/day/winter/winterNight presets that blend | Every sea/coast/ocean scene; tune presets for storms, sunsets | ✅ good (video 01) |
| **JETTY** | `buildJetty()` · `world/exterior/jetty.js` | Plank jetty on piles with ladder, bollards, rope coil, barrel, crates, lantern post | Docks, piers, river landings, boardwalks | ✅ good (video 01); add wear/variation when reused |
| **LAMP_ROOM (round interior)** | `buildLampRoom()` · `world/lampRoom.js` | Octagonal glazed room, planked conical ceiling + rafters, low iron walls (inside red plaster / outside cream plates), hatch, desk, chalkboard joke sign, lantern, gears box with crank, dust motes; night/dusk/morning/winter | Any small round interior: observatory, tower top, watch room, mill top; swap the centrepiece, recolour walls | ⚠ UPGRADE BEFORE REUSE: palette too orange/warm, lens is a stack of rings; needs more depth detail |
| **Set building blocks** | `world/geometry.js`, `world/materials.js` | roundedBox, plankField (boards with gaps), lathe, extrude, gearShape, tube, PBR materials from Poly Haven/ambientCG, chalkboard/plaque/sign textures | Any new room or building | ✅ tools |

## Story props (all ✅ from video 01 unless noted)
| Template name | Builder (file) | Notes |
|---|---|---|
| SCHOONER (sailing ship) | `buildSchooner()` · `world/exterior/boats.js` | Two-mast ship with sails, lanterns, deck spots for captain + 2 sailors; recolour hull/sails |
| SUPPLY_BOAT | `buildSupplyBoat({ name, sub })` · boats.js | Small motor boat with a readable name board (any text) |
| ROWBOAT | `buildRowboat()` · boats.js | With bump-and-settle control |
| LIGHT_BEAMS (lighthouse/searchlight) | `createBeams()` · `world/fx.js` (inside), `createOutsideBeams()` · `world/exterior/fx.js` (outside) | Rotating soft beam cones from a light source; any searchlight / lantern beam |
| GULLS | `perchedGull()`, `flyingGull()` · world/exterior/fx.js | Perched (can hold binoculars) or flying |
| SNOWFALL | `createSnowfall()` · world/exterior/fx.js | Non-flickering falling snow |
| DUST MOTES | `createDust()` · world/fx.js | Motes in the key light, never in front of faces |
| LIQUID POOL / POUR | `createPool()`, `createPour()` · world/fx.js | Mirror-like liquid in a basin that fills, wobbles; pouring stream from a spout (any liquid: recolour) |
| VAPOUR WISPS | in `world/fx.js` (lampRoom `fx.vapour`) | Rising wisps that can drift to a target and avoid faces |
| HAND PROPS | `createSandwich`, `createRag`, `createToolbox`, `createJug`, `createOilPuddle` · `world/props.js` | Each has `userData.grip` so it sits in a character's finger hook |
| Poly Haven glTF props | `prop(name)` · world/props.js (`public/models/`) | crates, barrel, lantern, bucket, oil can/tin, books, hammer, metal jug |

## Characters (templates, not recurring cast)
`createCharacter(spec)` · `characters/index.js`; ready specs in `characters/specs.js`: KEEPER (red beanie, yellow knit coat,
beard), ENGINEER (bowl-cut hair, glasses, check coat), CAPTAIN, SAILOR_A, SAILOR_B, FISHER, BAKER, LADY, KID. Face sets:
`keeper`, `engineer`, `folk` (clean), `folkb` (beard). Hats: beanie, captain, sailor, beret, oilskin, toque, bonnet, cap.
**New video = new characters made by changing a spec** (coat type/colour/pattern, hat, hair, accessory, face set, seed, scale).
Poses: rest, hip, wave, thumbChest, shrug, fold, fingerUp, present, point, grab, poke, push, pokeChest, crank, polish, pour,
slapKnee, fistsUp, mimic, handshake, climb, hold, tapHead, limp; `sit`/`seat`, `legL/legR` targets; `handFrame()` for props.

## Video tools
| Tool | File |
|---|---|
| Smooth camera paths + flights | `timeline/camPath.js` (monotone tangents, flightKeys) |
| Word-keyed direction template | `videos/v01/direction.js` (shot keys, `F()` distance framing, props in hands, 2D gag overlays) |
| World assembly + render loop | `videos/v01/Video.jsx` |
| Captions / soundtrack / master | `timeline/Captions.jsx`, `timeline/Soundtrack.jsx`, `timeline/finish.sh` |
| Sound plan + pre-mix | `videos/v01/sound_plan.py`, `tools/mix_fx.py` |
| Glitch scan / contact sheets | `tools/popscan.py`, `tools/sheet.py` |
