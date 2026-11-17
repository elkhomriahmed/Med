// Video 1 direction: "Why Lighthouse Keepers Went Mad" (script v4, 242 words, voice 63.9 s, shot list videos/01_lighthouse_mercury/shotlist_v4.md).
// Everything is keyed to word times (public/audio/words_v4.json). Pure functions of t: any frame renders the same in any order.
import * as THREE from "three";
import WORDS from "../../public/audio/words_v4.json";
import { cameraPath } from "../../timeline/camPath.js";
import { armAt, visemeAt } from "../../characters/index.js";

export const FPS = 30;
export const END = WORDS[WORDS.length - 1][1] + 0.3;               // ends 0.3 s after the last word
export const DURATION = Math.round(END * FPS);
export { WORDS };
export const T = (i) => WORDS[i][0];
export const E = (i) => WORDS[i][1];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const cl = THREE.MathUtils.clamp;
const ss = (a, b, t) => { const x = cl((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const sm = (a, b, t) => { const x = cl((t - a) / (b - a), 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
const step = (keys, t, def) => { let v = def; for (const [k, x] of keys) if (t >= k) v = x; return v; };
const faceTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

// ------------------------------------------------------------------ shot boundaries (seconds)
export const S = {
  hook: 0, youSee: T(12), crank: T(27), sandwich: T(35), ship: T(43), company: T(49), gears: T(56), pour: T(63), push: T(70),
  spin: T(77), laughs: T(87), son: T(91), works: T(108), morning: T(117), stops: T(133), boatName: T(137), captain: T(144),
  barrel: T(149), oil: T(157), winter: T(168), town: T(180), back: T(193), mercury: T(198), friction: T(205), vapour: T(214),
  sealed: T(220), ships: T(232), man: T(236), end: END,
};

/** Time of day per system at t: [room, ext (name or [a, b, k] blend), town]. */
export function timeAt(t) {
  if (t < S.company - 0.15) return ["night", "night", "night"];
  if (t < S.gears) { const k = sm(S.company - 0.15, S.company + 0.45, t); return [k < 0.5 ? "night" : "dusk", ["night", "dusk", k], "dusk"]; }
  if (t < S.morning) { const k = sm(S.gears - 0.1, S.gears + 0.5, t); return ["night", ["dusk", "night", k], "night"]; }
  if (t < S.boatName - 0.2) { const k = sm(S.morning - 0.1, S.morning + 0.55, t); return [k < 0.45 ? "night" : "morning", ["night", "morning", k], "day"]; }
  if (t < S.winter) { const k = sm(S.boatName - 0.2, S.boatName + 0.4, t); return ["morning", ["morning", "day", k], "day"]; }
  if (t < S.back + 0.35) return ["winter", "winter", "winter"];
  { const k = sm(S.back + 0.35, S.back + 1.0, t); return [k < 0.5 ? "winter" : "night", ["winter", "night", k], "winter"]; }
}

/**
 * Builds the direction once the world exists. W = { room, ext, town } (their anchors), returns { camAt(t), act(t, live) }.
 * live = { keeperHead(), engineerChest(), spot(obj) } for things that move every frame (boat decks, crank handle).
 */
export function makeDirection(W) {
  const A = W.room.anchors, X = W.ext.anchors, TW = W.town.anchors;
  const L = A.lens.clone(), POOL = A.pool.clone(), PLAQUE = A.plaque.clone(), GEARS = A.gears.clone(), HATCH = A.hatch.clone();
  const LR = 0.46;                                                  // lens outer radius (m)
  const lensPt = (from, y = 1.32, out = 0) => { const d = V(from.x - L.x, 0, from.z - L.z).normalize(); return V(L.x + d.x * (LR + out), y, L.z + d.z * (LR + out)); };
  // ---- spots in the lamp room (floor y = 0)
  // the mercury basin lip has radius 0.89 around the lens axis: everybody stands outside it (>= 1.05 m from the axis)
  const K_GEARS = V(-1.12, 0, 0.32), K_PED = V(-0.82, 0, 0.42), E_PED = V(0.98, 0, 0.32), K_TALK = V(-0.78, 0, 0.78), E_TALK = V(-0.16, 0, 0.78);
  const E_WALK0 = V(1.35, 0, -0.85), K_POLISH = A.polishSpot.clone(), K_OIL = V(0.6, 0, -0.35), SLEEP = V(-0.7, 0, 1.0);
  const JK = X.jettySpotKeeper.clone(), JE = X.jettySpotEngineer.clone(), POST = X.mooringPost.clone(), BARREL = V(0.45, X.mooringPost.y, 28.9);
  const gull = X.gullSpots[1].clone(); const inward = V(-gull.x, 0, -gull.z).normalize();
  const K_GALLERY = V(gull.x + 0.6, 0, gull.z).addScaledVector(inward, 0.62); K_GALLERY.y = 0;     // between two gulls, face above them
  const LIGHTHOUSE_TOP = V(0, 2.5, 0);

  // ---- camera: segments separated by real cuts (time jumps); inside a segment one continuous Hermite path
  const C = (t, pos, target, fov = 70, stop = false) => ({ t, pos, target, fov, stop });
  // framed key inside the lamp room: camera `dist` m from the subject on azimuth `az` (0 = +Z, the front), height h,
  // kept inside the glass (radius <= 2.4 m) so heads land at ~18-25% of the frame width with the wide lens
  const F = (t, subj, az, dist = 2.1, h = 1.3, fov = 90, stop = false) => {
    let d = dist, pos;
    for (let i = 0; i < 20; i++) { pos = V(subj.x + Math.sin(az) * d, h, subj.z + Math.cos(az) * d); if (Math.hypot(pos.x, pos.z) <= 2.4) break; d *= 0.95; }
    return C(t, pos, subj.clone(), fov, stop);
  };
  const inWin = V(0, 1.55, 2.25), outWin = V(0, 1.6, 4.6), outWinFar = V(0.4, 2.1, 7.5);
  const sw = X.shipSwervePath.closest.clone(), REEF = X.shipSwervePath.reef.clone();
  const town = { from: TW.views.fromWater, crowd: TW.views.crowdWide, two: TW.views.twoShot };
  const seaWide = X.seaWide;
  // the passing ships sail ~160 m out on the +Z side (x -320..320); these views see one under the sweeping beam
  const SEAVIEW = { pos: V(4, 9, -9), target: V(-25, -30, 165) };            // from behind the lamp room, over the tower top
  const SEAFRONT = { pos: V(-4, 3, 34), target: V(-25, -31, 165) };          // low over the sea in front of the tower
  const segA = cameraPath([
    F(0.0, V(0.35, 1.18, -0.05), 0.42, 2.45, 1.15, 94, true),
    F(1.45, V(0.33, 1.15, -0.08), 0.36, 2.0, 1.25, 90),
    C(2.3, V(-0.5, 1.78, 1.4), V(0.0, 0.98, -0.25), 74),
    C(3.1, V(-0.42, 1.88, 1.12), POOL.clone().add(V(0, 0.02, 0)), 68, true),
  ]);
  const segB = cameraPath([
    // 2 clockwork (wince at the tooth) -> 3 crank -> 4 sandwich
    F(S.youSee, V(-1.5, 0.92, 0.12), 0.2, 2.2, 1.3, 94, true),
    F(S.crank - 0.3, V(-1.45, 0.95, 0.15), 0.28, 2.15, 1.3, 94),
    F(S.sandwich, V(-1.25, 1.05, 0.28), 0.32, 2.0, 1.3, 92),
    F(T(42) + 0.3, V(-1.2, 1.1, 0.3), 0.35, 1.95, 1.32, 92),
    // 5 fly out of the window, down to the ship swerving past the reef
    C(S.ship + 0.05, inWin.clone(), V(0.2, 1.3, 9), 76),
    C(S.ship + 0.3, outWinFar.clone(), sw.clone().add(V(0, 2, 0)), 66),
    // across the reef: the ship swerving past the rocks, both in frame (camera well above the boulders)
    C(S.ship + 0.65, REEF.clone().add(V(13, 11, 9)), REEF.clone().lerp(sw, 0.55).add(V(0, 1.5, 0)), 56),
    C(S.company - 0.25, REEF.clone().add(V(11, 10, 8)), REEF.clone().lerp(sw, 0.6).add(V(0, 1.5, 0)), 54),
    // 6 fly to the jetty at dusk: the rowboat bumps, the engineer steps out
    C(S.company + 0.2, V(-8, -22, 26), V(1.5, -33.0, 25.5), 60),                   // high over the water, never skimming rocks or the boat
    C(S.company + 0.6, V(-1.0, -31.2, 20.4), V(2.2, -33.0, 26.4), 58),
    C(S.gears - 0.35, V(-0.7, -31.55, 21.2), V(2.4, -33.0, 26.6), 55),
    // 7 fly up the tower and in through the window: keeper presents the gears, the engineer walks past
    C(S.gears + 0.2, V(3.5, -18, 12), V(0, -6, 0), 60),
    C(S.gears + 0.55, outWin.clone().add(V(0.3, 0.4, 1.2)), V(0, 1.4, 0), 62),
    C(S.gears + 0.8, inWin.clone(), V(-0.4, 1.1, 0.3), 88),
    F(S.pour - 0.25, V(-0.35, 1.0, 0.6), 0.25, 2.1, 1.3, 92),
    // 8 pour, 9 push, 10 spin, 11 laughs, 12 "Son..."
    F(S.pour + 0.25, V(0.55, 1.1, 0.05), 0.0, 2.35, 1.4, 90),
    F(S.push - 0.1, V(0.55, 1.2, 0.05), 0.05, 2.35, 1.4, 90),
    F(S.push + 1.2, V(0.55, 1.22, 0.05), 0.1, 2.3, 1.42, 88),
    F(S.spin + 0.2, V(0.0, 1.12, 0.2), 0.05, 2.25, 1.28, 94),
    F(S.laughs - 0.1, V(-0.2, 1.1, 0.25), 0.0, 2.2, 1.25, 94),
    F(S.laughs + 0.6, V(-0.75, 1.05, 0.42), 0.28, 1.9, 1.22, 90),
    F(S.son + 0.4, V(-0.47, 1.1, 0.78), 0.1, 2.0, 1.25, 96),
    F(S.works - 0.3, V(-0.45, 1.1, 0.78), 0.14, 1.95, 1.24, 96),
    // 13 fly out: the beam sweeps over the sea, ships glide past
    C(S.works + 0.2, inWin.clone(), V(0, 1.6, 9), 72),
    C(S.works + 0.55, outWinFar.clone(), V(-8, -2, 40), 66),
    C(S.works + 0.75, V(10, 6, 2), V(-10, -12, 90), 56),                            // round the side of the lamp room
    C(S.works + 1.2, SEAVIEW.pos.clone(), SEAVIEW.target.clone(), 50),
    C(S.morning - 0.4, SEAVIEW.pos.clone().add(V(-1, -0.5, 1.5)), SEAVIEW.target.clone().add(V(4, 0, 0)), 50),
    C(S.morning + 0.2, V(10, 5, 4), V(0, 1, 0), 56),                                // back round the side to the front window
    // 14 morning: fly back in through the window, keeper polishing the silver basin; 15 humming stops (slow push)
    C(S.morning + 0.55, outWin.clone().add(V(0.6, 0.5, 2.2)), V(0.4, 1.2, 0), 60),
    C(S.morning + 0.95, inWin.clone().add(V(0.4, 0, 0)), V(0.7, 1.0, 0), 88),
    F(S.morning + 1.6, V(0.62, 1.0, -0.05), 0.9, 1.95, 1.32, 90),
    F(S.stops - 0.2, V(0.75, 1.05, 0.0), 0.85, 2.15, 1.32, 90),
    F(S.boatName - 0.45, K_POLISH.clone().add(V(0, 1.15, 0)), 0.8, 1.95, 1.32, 88),
    // 16 fly down to the jetty (day): supply boat name board, "?"; 17 handshake with the post; 18 barrel
    C(S.boatName - 0.05, inWin.clone().add(V(0.3, 0, 0)), V(0.3, 1.0, 9), 82),
    C(S.boatName + 0.15, outWin.clone().add(V(0.2, 0.2, 0.8)), V(0, -12, 22), 70),
    C(S.boatName + 0.4, V(4, -14, 14), V(0, -30, 24), 60),
    C(S.boatName + 0.75, V(1.3, -31.5, 30.0), V(-1.4, -32.6, 26.2), 54),
    C(S.captain - 0.2, V(1.05, -31.6, 30.3), V(-1.2, -32.6, 26.8), 54),
    C(S.captain + 0.35, V(1.25, -31.6, 31.9), V(-0.5, -32.5, 28.3), 56),
    C(S.barrel - 0.15, V(1.35, -31.6, 32.0), V(-0.3, -32.5, 28.5), 56),
    C(S.barrel + 0.4, BARREL.clone().add(V(0.6, 1.55, 2.9)), BARREL.clone().add(V(-0.3, 0.75, 0)), 56),
    C(S.oil - 0.2, BARREL.clone().add(V(0.5, 1.6, 2.8)), BARREL.clone().add(V(-0.3, 0.8, 0)), 56),
    // 19 fly up into the lamp room: the shaking oil can spills, twice
    C(S.oil + 0.05, BARREL.clone().add(V(0.8, 4.2, 5.0)), BARREL.clone().add(V(0, 0.8, 0)), 58),   // rise up and back first (clear of the keeper)
    C(S.oil + 0.35, V(4, -12, 10), V(0, 0, 0), 62),
    C(S.oil + 0.6, outWin.clone().add(V(0.5, 0.3, 1)), V(0.4, 1.0, 0), 62),
    C(S.oil + 0.85, inWin.clone().add(V(0.5, -0.1, 0)), V(0.6, 0.7, -0.3), 88),
    F(S.oil + 1.4, V(0.95, 0.85, 0.3), 0.55, 2.2, 1.35, 92),
    F(S.winter, V(0.95, 0.85, 0.3), 0.5, 2.1, 1.35, 92, true),
  ]);
  const gv = X.galleryOutsideView;
  const segC = cameraPath([
    // 20 by winter: gallery, gulls with binoculars, keeper yelling (cut: time jump)
    C(S.winter, V(0.9, 1.85, 7.3), V(0.45, 1.25, 3.3), 50, true),
    C(S.town - 0.35, V(0.75, 1.8, 6.9), V(0.45, 1.25, 3.3), 48),
    // 21 fly across the water to the town: townsfolk pointing and laughing
    C(S.town + 0.15, V(6, 6, 30), V(30, -20, 200), 62),
    C(S.town + 0.55, town.from.pos.clone().add(V(0, 6, -40)), town.from.target.clone(), 56),
    C(S.town + 0.95, town.from.pos.clone(), town.from.target.clone(), town.from.fov),
    C(T(186), TW.crowdCenter.clone().add(V(0.3, 1.9, -7.4)), TW.crowdCenter.clone().add(V(0, 1.1, 0)), 62),
    C(S.back - 0.1, TW.crowdCenter.clone().add(V(0.4, 1.8, -6.4)), TW.crowdCenter.clone().add(V(0, 1.05, 0)), 62),
    // 22 fly back across the water and up into the lamp room (night)
    C(S.back + 0.4, town.from.pos.clone().add(V(0, 8, -60)), V(0, 0, 0), 60),
    C(S.back + 0.9, outWin.clone().add(V(1.2, 1.5, 12)), V(0, 1.3, 0), 58),
    C(S.mercury - 0.25, outWin.clone(), V(0, 1.2, 0), 62),
    C(S.mercury + 0.05, inWin.clone(), PLAQUE.clone().add(V(0, 0.15, 0)), 70),
    // 23 plaque -> pool; 24 lens spins effortlessly; 25 vapour; 26 sealed hatch, keeper asleep
    C(S.mercury + 0.9, V(0.25, 0.72, 1.55), PLAQUE.clone(), 58),
    C(S.friction - 0.4, V(0.35, 1.55, 1.35), POOL.clone(), 64),
    F(S.friction + 0.3, L.clone().add(V(0, -0.1, 0)), 0.55, 2.2, 1.55, 84),
    F(S.vapour - 0.1, L.clone().add(V(0, -0.1, 0)), -0.35, 2.2, 1.55, 84),
    C(S.vapour + 0.5, V(-0.45, 1.25, 1.35), POOL.clone().add(V(0, 0.28, 0)), 66),
    C(S.sealed - 0.1, V(-0.1, 1.3, 1.4), POOL.clone().add(V(0, 0.34, 0)), 66),
    C(S.sealed + 0.4, V(0.55, 1.6, -1.55), HATCH.clone().add(V(0, 0.05, 0)), 66),
    C(T(225), V(0.5, 1.55, -1.45), HATCH.clone(), 64),
    F(T(227), SLEEP.clone().add(V(0.12, 0.42, -0.05)), 0.95, 2.2, 1.15, 88),
    F(S.ships - 0.25, SLEEP.clone().add(V(0.12, 0.42, -0.05)), 0.9, 2.05, 1.12, 86),
    // 27 fly out: ships pass safely under the beam; 28 slow pull back up to the window, keeper slumped inside
    C(S.ships + 0.1, inWin.clone(), V(0, 1.6, 9), 72),
    C(S.ships + 0.35, outWinFar.clone().add(V(0, 1, 2)), V(-8, -2, 60), 62),
    C(S.ships + 0.6, SEAFRONT.pos.clone(), SEAFRONT.target.clone(), 50),
    C(S.man - 0.4, SEAFRONT.pos.clone().add(V(0.4, 0.2, -1.2)), SEAFRONT.target.clone(), 50),
    C(S.man + 0.2, X.towerWindowView.position.clone().add(V(-0.6, -0.3, -2.5)), V(-0.5, 0.8, 0.2), 52),   // then a slow pull back
    C(S.end, X.towerWindowView.position.clone().add(V(-0.3, 0.6, 1.6)), V(-0.4, 1.0, 0.1), 52, true),
  ]);
  function camAt(t) {
    if (t < S.youSee) return segA(t);
    if (t < S.winter) return segB(t);
    return segC(t);
  }

  // ---- props: which character holds what, when (grip at the hand), and story controls
  function act(t, live) {
    const K = { visible: true, pos: K_PED.clone(), rot: 0.35, s: { expression: "neutral" } };
    const G = { visible: false, pos: E_PED.clone(), rot: -0.55, s: { expression: "neutral" } };
    const cast = { keeper: K, engineer: G };
    const hide = (id) => (cast[id] = { visible: false });
    for (const id of ["captain", "sailorA", "sailorB", "fisher", "baker", "lady", "kid"]) hide(id);
    const room = { poolFill: 1, poolWobble: 0.25, pour: 0, vapour: 0, oilSpill: 0, toothPop: 0, crank: null, lensAngle: null, windowOutOpen: false, vapourTarget: null };
    const ext = { swerve: 0.2, rowboat: 0, passing: null, focus: null };
    const props = {};                                    // name -> { holder: "keeper"|"engineer", side: "L"|"R" } | { hide: true }
    const overlays = [];                                 // 2D gag graphics: { kind, at (world), t0 }
    const blink = (t0s) => (t0s.some((b) => t >= b && t < b + 0.12) ? "_blink" : "");
    let zone = "room";

    // lens angle: still before the mercury, then the glide in the hook; the record-spin after the push
    const lensSpinStart = T(82) - 0.2;
    const spinAngle = (tt) => 3.4 + 0.95 * Math.max(0, tt - lensSpinStart);

    if (t < S.youSee) {                                  // 1 HOOK: finger on the lens, it glides on the silver pool
      K.visible = false; G.visible = true; G.pos = E_PED.clone(); G.rot = -0.4;
      G.s = { expression: step([[0, "smug"], [T(5), "neutral"], [T(10), "smug"]], t, "smug"), gaze: "_L", mouth: blink([2.0]),
        armR: { pose: "push", target: lensPt(E_PED, 1.36, 0.02), phase: 0 }, armL: { pose: "hip" }, lean: 0.06, turn: -0.15 };
      room.lensAngle = 3.4 + 0.55 * Math.max(0, t - 0.15) ** 1.6; room.poolWobble = 0.55;
    } else if (t < S.ship) {                             // 2-4 BEFORE: the clockwork, cranking, the sandwich (no mercury yet)
      room.poolFill = 0; room.lensAngle = 2.1 + 0.07 * t;
      K.pos = K_GEARS.clone(); K.rot = -1.3;               // beside the gear face, cranking with the camera-side hand
      room.toothPop = sm(T(24), T(24) + 0.55, t);
      room.crank = t < S.crank ? 0.3 * t : t < S.sandwich ? 0.3 * S.crank + 4.2 * (t - S.crank) : 0.3 * S.crank + 4.2 * (S.sandwich - S.crank);
      const crankHub = live.crankHub();
      K.s = {
        expression: step([[S.youSee, "neutral"], [T(24) - 0.05, "shock"], [T(25) + 0.15, "worried"], [S.crank, "angry"], [T(33), "worried"],
          [S.sandwich + 0.3, "neutral"], [T(42) - 0.3, "happy"]], t, "neutral"),
        gaze: step([[S.youSee, "_L"], [T(24), ""], [S.sandwich + 0.5, ""]], t, ""),
        mouth: t > T(42) - 0.2 && t < T(42) + 0.25 ? "_A" : t > T(24) - 0.05 && t < T(24) + 0.3 ? "_O" : blink([4.1, 7.2]),
        lean: t >= S.crank && t < S.sandwich ? 0.12 + 0.05 * Math.sin(room.crank) : t > T(41) ? -0.05 : 0.02,
        bob: t >= S.crank && t < S.sandwich ? 0.012 * Math.abs(Math.sin(room.crank)) : 0,
        nod: t >= T(24) - 0.05 && t < T(25) ? -0.1 : 0,
        armL: armAt([[S.youSee, { pose: "rest" }], [T(23), { pose: "shrug" }], [S.crank - 0.35, { pose: "grab", target: live.crankHandle() }],
          [S.sandwich + 0.1, { pose: "hold", target: live.keeperHead().add(V(0.05, -0.55, 0.32)) }],
          [T(41), { pose: "hold", target: live.keeperHead().add(V(0.05, -0.18, 0.3)) }]], t, 0.28),
        armR: armAt([[S.youSee, { pose: "hip" }], [T(23), { pose: "shrug" }], [S.crank - 0.2, { pose: "hip" }]], t, 0.28),
      };
      if (t > S.sandwich + 0.2) props.sandwich = { holder: "keeper", side: "L" };
      if (t >= S.crank - 0.2 && t < S.sandwich) overlays.push({ kind: "sweat", at: live.keeperHead().add(V(0.22, 0.12, 0)), t0: S.crank });
    } else if (t < S.gears + 0.75) {                     // 5-6 outside: the ship swerves; the rowboat bumps the jetty at dusk
      zone = t < S.company + 0.2 ? "sea" : t < S.gears + 0.35 ? "jetty" : "flight";
      K.visible = false;
      ext.swerve = cl(0.42 + 0.13 * (t - S.ship) / (T(46) - S.ship), 0, 0.55) + cl(0.07 * (t - T(46)), 0, 0.2);   // lingers at the reef
      if (t < S.company + 0.2) {
        const cap = live.spot("swerve", "captain"), s1 = live.spot("swerve", "sailor1"), s2 = live.spot("swerve", "sailor2");
        const tower = V(0, 1.5, 0);
        cast.captain = { visible: true, pos: cap, rot: faceTo(cap, tower), s: { expression: "angry", mouth: "_A", armL: { pose: "fistsUp", phase: t * 3 }, armR: { pose: "fistsUp", phase: t * 3 + 0.4 } } };
        cast.sailorA = { visible: true, pos: s1, rot: faceTo(s1, tower) + 0.6, s: { expression: "shock", mouth: "_O", armL: { pose: "shrug" }, armR: { pose: "wave", phase: t * 2.4 }, bob: 0.02 * Math.sin(t * 15) } };
        cast.sailorB = { visible: true, pos: s2, rot: faceTo(s2, tower) - 0.5, s: { expression: "shock", mouth: "_A", armL: { pose: "fistsUp", phase: t * 2.2 }, armR: { pose: "shrug" }, bob: 0.02 * Math.sin(t * 13 + 1) } };
        ext.focus = { center: X.shipSwervePath.closest.clone(), half: 16 };
      } else {
        ext.rowboat = cl(0.55 + 0.25 * (t - S.company) / (T(52) - S.company), 0, 0.8) + cl(0.2 * (t - T(52)) / 0.7, 0, 0.2);
        const stand = live.spot("rowboat", "stand"), stepT = sm(T(55) - 0.35, T(55) + 0.05, t);
        G.visible = true; G.pos = stand.clone().lerp(JE, stepT); G.pos.y += 0.12 * Math.sin(Math.PI * stepT); if (stepT > 0.99) G.pos.copy(JE);
        G.rot = -0.45; G.s = { expression: step([[0, "neutral"], [T(55), "smug"]], t, "neutral"), gaze: "_L", mouth: blink([12.4]),
          armR: { pose: "hold", target: G.pos.clone().add(V(-0.28, 0.42, 0.12)) }, armL: { pose: "rest" }, lean: 0.03 };
        props.toolbox = { holder: "engineer", side: "R" };
        ext.focus = { center: V(0.5, -33, 25.5), half: 9 };
      }
    } else if (t < S.works + 0.3) {                      // 7-12 lamp room night: gears ignored, pour, push, spin, laugh, "Son..."
      G.visible = true;
      // the engineer walks in past the gears to the pedestal; the keeper presents his gears, then goes to the pedestal
      const walk = sm(S.gears + 0.75, S.pour - 0.1, t);
      const eTalk = sm(S.son - 0.5, S.son, t);
      G.pos = E_WALK0.clone().lerp(E_PED, walk).lerp(E_TALK, eTalk); G.rot = walk < 0.98 ? faceTo(E_WALK0, E_PED) : eTalk > 0.5 ? -0.9 : -0.4;
      G.s.bob = (walk > 0.01 && walk < 0.99) || (eTalk > 0.02 && eTalk < 0.98) ? 0.025 * Math.abs(Math.sin(t * Math.PI * 3.6)) : 0;
      const kWalk = sm(S.pour - 0.1, S.pour + 0.6, t), kTalk = sm(S.son - 0.45, S.son + 0.05, t);
      K.pos = K_GEARS.clone().lerp(K_PED, kWalk).lerp(K_TALK, kTalk); K.rot = kTalk > 0.5 ? 0.9 : kWalk > 0.5 ? 0.55 : -0.2;
      K.s.bob = (kWalk > 0.02 && kWalk < 0.98) || (kTalk > 0.02 && kTalk < 0.98) ? 0.022 * Math.abs(Math.sin(t * Math.PI * 3.4)) : 0;
      if (t >= S.spin + 0.45 && t < S.laughs) { K.pos.x -= 0.16 * sm(T(86) + 0.3, T(86) + 0.55, t); }    // jumps back from the spinning lens
      room.poolFill = sm(T(64) + 0.1, T(69) + 0.2, t); room.pour = t > T(64) - 0.05 && t < T(69) + 0.35 ? sm(T(64) - 0.05, T(64) + 0.25, t) * (1 - sm(T(69), T(69) + 0.35, t)) : 0;
      room.poolWobble = 0.3 + 0.5 * room.pour;
      // lens: still -> one push -> spinning like a record (scratched on "record")
      const scratch = t > T(86) - 0.05 && t < T(86) + 0.6 ? 0.22 * Math.sin((t - T(86)) * 2 * Math.PI * 3) : 0;
      room.lensAngle = 2.1 + 0.07 * S.youSee + (t < S.push ? 0 : 0.6 * sm(T(73), T(73) + 0.8, t) * (t - T(73)) ** 2 * 0.0) + spinAngle(t) - 3.4 + scratch;
      const lensE = lensPt(E_PED, 1.34, 0.04);
      G.s = {
        expression: step([[0, "neutral"], [S.pour, "smug"], [S.push, "neutral"], [T(73), "smug"], [S.spin, "happy"], [S.laughs, "neutral"],
          [S.son + 0.3, "smug"], [T(103), "happy"]], t, "neutral"),
        gaze: step([[0, ""], [S.pour, "_L"], [S.laughs, "_L"]], t, ""), mouth: t > T(76) && t < T(76) + 0.5 ? "_O" : blink([16.0, 23.2]), bob: G.s.bob,
        armR: armAt([[0, { pose: "hold", target: G.pos.clone().add(V(0.3, 0.42, 0.1)) }],
          [S.pour - 0.15, { pose: "pour", amount: 0.85, target: POOL.clone().add(V(0.5, 0.42, 0.32)) }],
          [T(69) + 0.4, { pose: "rest" }], [S.push + 0.05, { pose: "fingerUp" }], [T(73) - 0.1, { pose: "push", target: lensE, phase: 0 }],
          [T(74) + 0.05, { pose: "fingerUp" }], [S.spin + 0.1, { pose: "rest" }],
          [T(85), { pose: "push", target: lensE, phase: (t - T(85)) * 3 }], [E(86) + 0.2, { pose: "fold" }]], t, 0.25),
        armL: armAt([[0, { pose: "rest" }], [E(86) + 0.2, { pose: "fold" }]], t),
        turn: -0.1, lean: t >= S.pour - 0.2 && t < S.spin + 0.3 ? 0.2 : t >= T(85) - 0.2 && t < E(86) + 0.2 ? 0.2 : 0.02,
      };
      if (t < S.pour - 0.15) props.toolbox = { holder: "engineer", side: "R" }; else props.toolbox = { place: E_PED.clone().add(V(0.45, 0, -0.35)), rot: 0.4 };
      if (t >= S.pour - 0.15 && t < T(69) + 0.4) props.jug = { holder: "engineer", side: "R" };
      const engChest = live.engineerChest();
      K.s = {
        expression: step([[0, "proud"], [S.pour, "skeptical"], [S.spin + 0.3, "shock"], [S.laughs - 0.1, "laugh"], [S.son - 0.1, "smug"],
          [T(96), "skeptical"], [T(101), "smug"], [T(107), "skeptical"], [S.works - 0.1, "shock"]], t, "neutral"),
        gaze: step([[0, ""], [S.pour, "_R"], [S.spin, ""], [S.son, "_R"]], t, ""),
        mouth: t >= S.son && t < E(107) ? visemeAt(WORDS, t) : t >= S.laughs && t < S.son - 0.1 ? "_A" : blink([15.4, 18.6]),
        bob: K.s.bob + (t >= S.laughs && t < S.son - 0.15 ? 0.012 * Math.sin(t * 2 * Math.PI * 6) : 0),
        lean: t >= S.laughs && t < S.son - 0.1 ? 0.2 : t > S.spin + 0.5 && t < S.laughs ? -0.12 : 0,
        armR: armAt([[0, { pose: "present", target: GEARS.clone().add(V(0, 0.1, 0.2)) }], [S.pour - 0.1, { pose: "rest" }],
          [S.spin + 0.5, { pose: "shrug" }], [S.laughs, { pose: "slapKnee", phase: t * 2.2 }], [S.son - 0.2, { pose: "hip" }]], t),
        armL: armAt([[0, { pose: "present", target: GEARS.clone().add(V(0.2, 0.2, 0.3)) }], [S.pour - 0.1, { pose: "fold" }],
          [S.spin + 0.5, { pose: "shrug" }], [S.laughs, { pose: "slapKnee", phase: t * 2.2 + 0.5 }],
          [S.son, { pose: "pokeChest", target: engChest, phase: (t - S.son) * 2 }], [T(92) + 0.3, { pose: "thumbChest" }],
          [T(99) - 0.1, { pose: "fingerUp" }], [T(101) - 0.1, { pose: "point", target: POOL.clone().add(V(0.2, 0.05, 0.4)) }],
          [S.works - 0.15, { pose: "shrug" }]], t),
        turn: t >= S.son ? 0.25 : 0,
      };
    } else if (t < S.morning + 0.55) {                   // 13 outside at night: the beam sweeps, ships glide past safely
      zone = "sea"; K.visible = false; G.visible = false; ext.passing = 0.43 + 0.006 * (t - S.works);
    } else if (t < S.boatName + 0.2) {                   // 14-15 morning: polishing + humming; the humming stops
      K.pos = K_POLISH.clone(); K.rot = faceTo(K_POLISH, POOL) + 0.5;
      const rim = POOL.clone().add(V(0.42, 0.0, 0.14));
      K.s = {
        expression: step([[0, "happy"], [T(131), "proud"], [S.stops + 0.1, "neutral"]], t, "happy"),
        gaze: step([[0, "_L"], [S.stops + 0.1, ""]], t, ""), mouth: t < S.stops + 0.1 && Math.sin(t * 9) > 0.2 ? "_O" : blink([30.2]),
        armL: armAt([[0, { pose: "polish", target: rim, normal: V(0, 1, 0), phase: t * 1.6, r: 0.08 }], [T(130), { pose: "hold", target: rim.clone().add(V(-0.05, 0.08, 0.05)) }],
          [S.stops, { pose: "rest" }]], t),
        armR: armAt([[0, { pose: "hip" }], [T(130), { pose: "hold", target: rim.clone().add(V(0.1, 0.1, 0.28)) }], [S.stops, { pose: "rest" }]], t),
        lean: t > T(130) && t < S.stops ? 0.16 : 0.06, tilt: t > T(130) && t < S.stops ? 0.12 : 0,
      };
      props.rag = t < S.stops ? { holder: "keeper", side: "L" } : { place: K_POLISH.clone().add(V(-0.25, 0.85, -0.2)), rot: 0.3 };
      if (t < S.stops + 0.1) overlays.push({ kind: "notes", at: live.keeperHead().add(V(0.25, 0.25, 0)), t0: S.morning + 0.8 });
      else overlays.push({ kind: "notesFall", at: live.keeperHead().add(V(0.25, 0.25, 0)), t0: S.stops + 0.1 });
    } else if (t < S.oil + 0.55) {                       // 16-18 jetty (day): boat name "?", handshake with the post, the barrel
      zone = "jetty"; G.visible = false;
      const capS = live.spot("supply", "captain"), s1 = live.spot("supply", "sailor1"), s2 = live.spot("supply", "sailor2");
      cast.captain = { visible: true, pos: capS, rot: faceTo(capS, JK) , s: { expression: step([[0, "happy"], [S.captain + 0.6, "skeptical"]], t, "happy"),
        mouth: blink([36.0]), armR: armAt([[0, { pose: "rest" }], [S.captain - 0.15, { pose: "wave", phase: t * 2.2 }], [S.barrel, { pose: "hip" }]], t), armL: { pose: "hip" } } };
      cast.sailorA = { visible: true, pos: s1, rot: faceTo(s1, JK), s: { expression: step([[0, "neutral"], [S.barrel + 0.4, "shock"]], t, "neutral"), armL: { pose: "rest" }, armR: { pose: "rest" } } };
      cast.sailorB = { visible: true, pos: s2, rot: faceTo(s2, JK), s: { expression: step([[0, "smug"], [S.barrel + 0.4, "skeptical"]], t, "smug"), armL: { pose: "fold" }, armR: { pose: "fold" } } };
      const postSpot = POST.clone().add(V(0.45, 0, -0.3)), barrelSpot = BARREL.clone().add(V(-0.48, 0, -0.1));
      const toPost = sm(S.captain - 0.3, S.captain + 0.25, t), toBarrel = sm(S.barrel - 0.2, S.barrel + 0.3, t);
      K.pos = JK.clone().lerp(postSpot, toPost).lerp(barrelSpot, toBarrel); K.pos.y = JK.y;
      K.rot = toBarrel > 0.5 ? faceTo(barrelSpot, BARREL) : toPost > 0.5 ? faceTo(postSpot, POST) : faceTo(JK, X.supplyBoatNameBoard);
      K.s = {
        expression: step([[0, "skeptical"], [T(142), "worried"], [S.captain + 0.2, "happy"], [S.barrel + 0.1, "neutral"]], t, "neutral"),
        gaze: "", mouth: blink([35.0, 37.0]), bob: (toPost > 0.02 && toPost < 0.98) || (toBarrel > 0.02 && toBarrel < 0.98) ? 0.022 * Math.abs(Math.sin(t * Math.PI * 3.4)) : 0,
        armL: armAt([[0, { pose: "rest" }], [S.captain + 0.1, { pose: "handshake", target: POST.clone().add(V(0, 0.95, 0)), phase: t * 2.4 }],
          [S.barrel + 0.2, { pose: "climb", target: BARREL.clone().add(V(0.12, 0.92, 0.12)) }]], t),
        armR: armAt([[0, { pose: "hip" }], [T(141) - 0.1, { pose: "fingerUp" }], [S.captain, { pose: "rest" }],
          [S.barrel + 0.2, { pose: "climb", target: BARREL.clone().add(V(-0.12, 0.92, 0.18)) }]], t),
        legR: t > S.barrel + 0.35 ? { target: BARREL.clone().add(V(0.15, 0.95, 0.3)), lift: sm(S.barrel + 0.35, S.barrel + 0.8, t) } : undefined,
        lean: t > S.barrel + 0.3 ? 0.18 : 0, nod: t > T(140) && t < S.captain ? 0.08 : 0, tilt: t > T(141) && t < S.captain ? 0.14 : 0,
      };
      if (t > T(143) - 0.1 && t < S.captain + 0.2) overlays.push({ kind: "question", at: live.keeperHead().add(V(0, 0.42, 0)), t0: T(143) - 0.1 });
      ext.focus = { center: V(-0.6, -33, 27), half: 9 };
    } else if (t < S.winter) {                           // 19 lamp room (morning light): the oil can shakes and spills, twice
      K.pos = K_OIL.clone().add(V(0.35, 0, 0.55)); K.rot = 0.85;
      room.oilSpill = 0.5 * sm(T(163), T(163) + 0.5, t) + 0.5 * sm(T(167), T(167) + 0.5, t);
      const shake = 0.018 * Math.sin(t * 2 * Math.PI * 3.5);            // slow enough to read at 30 fps (no flicker)
      K.s = { expression: step([[0, "worried"], [T(163), "shock"], [T(164) + 0.3, "worried"], [T(167), "shock"]], t, "worried"), mouth: t > T(163) && t < T(163) + 0.3 ? "_O" : "",
        armR: { pose: "pour", amount: 0.25 + 0.55 * (sm(T(163) - 0.2, T(163) + 0.1, t) - sm(T(165), T(166), t) + sm(T(167) - 0.2, T(167) + 0.1, t)), target: K_OIL.clone().add(V(0.35, 0, 0.55)).add(V(0.12, 0.62 + shake, 0.42 + shake)) },
        armL: { pose: "rest" }, bob: 0.004 * Math.sin(t * 2 * Math.PI * 3), lean: 0.08 };
      props.oilCan = { holder: "keeper", side: "R" };
    } else if (t < S.town + 0.35) {                      // 20 winter gallery: gulls with binoculars, keeper yelling
      zone = "gallery"; G.visible = false;
      K.pos = K_GALLERY.clone(); K.rot = faceTo(K_GALLERY, gull);
      K.s = { expression: step([[0, "angry"], [T(175), "worried"], [T(177), "angry"]], t, "angry"), mouth: t > T(171) - 0.1 && t < T(174) + 0.3 ? "_A" : "_O",
        armL: { pose: "fistsUp", phase: t * 3.2 }, armR: { pose: "fistsUp", phase: t * 3.2 + 0.45 }, lean: 0.14, bob: 0.01 * Math.sin(t * 2 * Math.PI * 3.2) };
      ext.focus = { center: V(gull.x, 1, gull.z), half: 5 };
    } else if (t < S.back + 0.45) {                      // 21 town (winter): pointing, laughing, head tap, the kid mimics
      zone = "town"; K.visible = false; G.visible = false;
      const sp = TW.spots, lh = V(0, 6, 0);
      const folk = (id, pos, s) => (cast[id] = { visible: true, pos: pos.clone(), rot: faceTo(pos, lh) * 0.35 + Math.PI * 0.65 * 0 + Math.PI, s });
      const laugh = (ph) => ({ expression: t > T(183) - 0.1 ? "laugh" : "smug", mouth: t > T(183) - 0.1 && t < T(189) ? (Math.sin(t * 20 + ph) > 0 ? "_A" : "_E") : "", bob: t > T(183) ? 0.01 * Math.sin(t * 2 * Math.PI * 5 + ph) : 0 });
      folk("fisher", sp.fisher, { ...laugh(0), armR: armAt([[0, { pose: "point", target: lh }], [T(190) - 0.2, { pose: "tapHead", phase: (t - T(190)) * 3 }]], t), armL: { pose: "hip" } });
      folk("baker", sp.baker, { ...laugh(1), armL: { pose: "point", target: lh }, armR: { pose: "slapKnee", phase: t * 2 }, lean: 0.12 });
      folk("lady", sp.lady, { ...laugh(2), expression: t > T(183) - 0.1 ? "happy" : "skeptical", armL: { pose: "hold", target: sp.lady.clone().add(V(0, 1.15, 0.25)) }, armR: { pose: "rest" } });
      folk("kid", sp.kid, { ...laugh(3), expression: "angry", mouth: "_A", armL: { pose: "mimic", phase: t * 3.2 }, armR: { pose: "mimic", phase: t * 3.2 + 0.4 } });
      folk("captain", sp.extra, { ...laugh(4), armL: { pose: "point", target: lh }, armR: { pose: "hip" } });
    } else {                                              // 22-28 the reveal (night): plaque, spin, vapour, sealed hatch, asleep; ships safe
      zone = t < S.mercury - 0.2 || t > S.ships + 0.2 ? "flight" : "room"; G.visible = false;
      room.vapour = 0.72 * sm(S.vapour - 0.2, S.vapour + 1.2, t);
      K.visible = t > S.sealed + 0.2;
      K.pos = SLEEP.clone(); K.rot = 0.55;
      K.s = { expression: "sleepy", mouth: "_blink", sit: 1, seat: 0, nod: 0.22 + 0.03 * Math.sin(t * 1.4), tilt: 0.18, armL: { pose: "limp" }, armR: { pose: "limp" },
        bob: 0.006 * Math.sin(t * 2 * Math.PI * 0.35) };
      if (K.visible) room.vapourTarget = live.keeperHead().add(V(0.0, -0.02, 0.22));
      if (t > S.ships - 0.3) ext.passing = 0.43 + 0.006 * (t - S.ships);
    }
    return { cast, room, ext, props, overlays, zone };
  }

  return { camAt, act, timeAt, spots: { K_PED, E_PED, K_GALLERY, BARREL } };
}
