// Video 3 direction: "If you light a candle inside a flour mill" (script v1, 275 words, voice 62.5 s at 4.4 words/s).
// Everything is keyed to word times (public/audio/words_v03.json) and is a pure function of t.
// Rules: RUNBOOK + STYLE_BIBLE 2026-11-23 (glide only inside the mill; far changes = designed cut + sound), eye-lines via lookAt,
// one cool night scheme + hot accents, faster pace (new framing every ~1 s) + exaggerated acting (user test, 2026-11-23).
import * as THREE from "three";
import WORDS from "../../public/audio/words_v03.json";
import { cameraPath } from "../../timeline/camPath.js";
import { armAt, visemeAt } from "../../characters/index.js";

export const FPS = 30;
export const END = WORDS[WORDS.length - 1][1] + 0.3;
export const DURATION = Math.round(END * FPS);
export { WORDS };
export const T = (i) => WORDS[i][0];
export const E = (i) => WORDS[i][1];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const cl = THREE.MathUtils.clamp;
const sm = (a, b, t) => { const x = cl((t - a) / (b - a), 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
const step = (keys, t, def) => { let v = def; for (const [k, x] of keys) if (t >= k) v = x; return v; };
const faceTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const K = (t, pos, target, fov = 56, stop = false) => ({ t, pos: pos.clone(), target: target.clone(), fov, stop });
const shakeV = (t, amp, f = 23) => V(Math.sin(t * f) * 0.6 + Math.sin(t * f * 1.7 + 1.3) * 0.4, Math.sin(t * f * 1.3 + 0.7) * 0.5, Math.sin(t * f * 0.9 + 2.1) * 0.4).multiplyScalar(amp);

// shot boundaries (designed cuts happen here; each has an accent sound in sound_plan.py)
export const S = {
  hook: 0, tease: T(9), rule: T(13), nos: T(20), laugh: T(31), night: T(44), sneak: T(50), strange: T(67), whump: T(89),
  shook: T(107), how: T(138), sci: T(151), puff: T(158), chain: T(171), warm: T(189), boom: T(206), flies: T(225), real: T(245),
  last: T(267), end: END,
};

export function zoneAt(t) {
  if (t >= S.sci && t < S.warm) return "science";
  if ((t >= S.tease && t < S.rule) || (t >= S.night && t < S.sneak) || (t >= S.boom)) return "outside";
  return "mill";
}
export const timeAt = (t) => (t >= S.rule && t < S.night ? "day" : "night");

export function makeDirection(W) {
  const M = W.mill.anchors, SCI = W.science.anchors.views;
  const head = (p, h = 1.42) => p.clone().add(V(0, h, 0));
  const fwd = (yaw) => V(Math.sin(yaw), 0, Math.cos(yaw));
  const TOP = M.topSpot.pos.clone(), CANDLE = M.candleSpot.clone(), yTop = faceTo(TOP, CANDLE);
  const TOPH = head(TOP), FLAME = CANDLE.clone().add(V(0, 0.16, 0));
  const NG = M.newGuyGround.pos.clone(), FM = M.foremanSpot.pos.clone(), CW = M.coworkerSpot.pos.clone();
  const SB = M.stairBottom.pos.clone(), ST = M.stairTop.pos.clone();
  const SIGN = M.signWall.pos.clone();
  const WIN = M.flyWindow.pos.clone(), LAND = M.riverLanding.clone();
  const BLAST = M.millExteriorBlastCenter.clone();
  const FM_OUT = V(3.2, 0, 4.55), yFmOut = 0.25;                         // foreman in the yard by the door side, ruins behind him
  const midFace = FLAME.clone().lerp(TOPH, 0.5);
  const Fd = fwd(yTop), SIDE = V(Fd.z, 0, -Fd.x);                         // his facing on the top floor + his left/right
  const CF = (dist, side = 0, up = 0, from = midFace) => from.clone().addScaledVector(Fd, dist * 1.45).addScaledVector(SIDE, side).add(V(0, up, 0));
  const vw = (v, push = 0, dfov = 0, t) => K(t, v.pos.clone().lerp(v.target, push), v.target, v.fov + dfov);
  const fb = (t) => cl((t - T(90) + 0.05) / 3.4, 0, 1);                      // races during "rolls across the ceiling", gone on "gone"                      // fireball progress

  // ---- one camera path per segment; segments meet at designed cuts (flash / whip / whoosh), never at a flight across the world
  const P = [
    [S.hook, cameraPath([                                                    // 1 hook: he lights the candle in the white haze
      K(0, CF(2.2, 0.9, 0.35), midFace, 60), K(0.7, CF(1.7, 0.55, 0.2), midFace, 54), K(S.tease, CF(1.25, 0.3, 0.1), midFace, 46)])],
    [S.tease, cameraPath([                                                   // 2 flash-forward: the mill bursts
      K(S.tease, V(14, 3.0, 22), V(-1, 3.8, 0), 50), K(S.rule, V(12.2, 3.6, 19.5), V(0, 5.0, 0), 54)])],
    [S.rule, cameraPath([                                                    // 3 day: the foreman slaps NO FLAMES on the wall
      K(S.rule, V(0.8, 1.7, 0.3), V(-3.4, 1.4, 0.3), 54), K(T(17) - 0.15, V(-0.9, 1.65, 0.2), SIGN, 48),
      K(T(19), V(-1.8, 1.62, 0.25), SIGN.clone().lerp(head(FM), 0.4), 44), K(S.nos, V(-1.9, 1.6, 0.35), SIGN.clone().lerp(head(FM), 0.5), 46)])],
    [S.nos, cameraPath([                                                     // 4 three snap-inserts: candle, lamp, match (whips between)
      K(S.nos, head(CW, 1.15).add(V(0.35, 0.1, -1.25)), head(CW, 1.05), 44), K(T(22) - 0.12, head(CW, 1.15).add(V(0.25, 0.1, -1.05)), head(CW, 1.05), 42),
      K(T(22) + 0.08, head(FM, 1.2).add(V(1.0, 0.05, -0.9)), head(FM, 1.15), 46), K(T(24) - 0.12, head(FM, 1.2).add(V(0.85, 0.05, -0.75)), head(FM, 1.15), 44),
      K(T(24) + 0.08, head(NG, 1.15).add(V(1.6, 0.1, 0.55)), head(NG, 1.15), 48), K(S.laugh, head(NG, 1.2).add(V(1.4, 0.1, 0.5)), head(NG, 1.2), 46)])],
    [S.laugh, cameraPath([                                                   // 5 he laughs: "pancakes, not bombs!"
      K(S.laugh, head(NG).add(V(1.95, -0.12, 0.45)), head(NG, 1.25), 56), K(T(37), head(NG).add(V(1.6, -0.08, 0.35)), head(NG, 1.3), 52),
      K(T(41), head(NG).add(V(1.35, -0.05, 0.25)), head(NG, 1.32), 48), K(S.night, head(NG).add(V(1.2, 0.0, 0.2)), head(NG, 1.35), 46)])],
    [S.night, cameraPath([                                                   // 6 night outside: freezing
      K(S.night, V(16, 3.4, 24), V(0, 4.0, 0), 52), K(S.sneak, V(12.5, 3.8, 18.5), V(-1, 4.6, 1), 48)])],
    [S.sneak, cameraPath([                                                   // 7 he sneaks up the stairs with the candle (glides inside the mill)
      K(S.sneak, V(0.6, 1.5, 1.4), V(3.5, 1.6, -0.6), 50), K(T(55), V(1.6, 4.1, 1.3), head(SB.clone().lerp(ST, 0.6)), 56),
      K(T(60), V(2.9, 4.95, -1.6), head(ST.clone().lerp(TOP, 0.5)), 58), K(S.strange, CF(2.3, 1.0, 0.4), midFace, 56)])],
    [S.strange, cameraPath([                                                 // 8 the air sparkles (push in, orbit)
      K(S.strange, CF(2.3, 1.0, 0.4), midFace, 56), K(T(75), CF(1.6, 0.6, 0.15), FLAME.clone().lerp(midFace, 0.5), 50),
      K(T(79), CF(1.1, 0.25, 0.05), midFace, 42), K(T(84), CF(1.3, -0.8, 0.1), midFace, 44), K(S.whump - 0.1, CF(1.9, -0.9, 0.3), midFace, 50)])],
    [S.whump, cameraPath([                                                   // 9 whump: the fireball rolls along the rafters
      K(S.whump, V(1.6, 4.3, -2.2), V(-2.8, 6.35, -0.95), 64), K(T(93), V(0.9, 4.35, -2.5), V(0.4, 6.45, -1.0), 64),
      K(T(98), V(-0.4, 4.45, -2.4), V(3.4, 6.35, -1.0), 62), K(T(101), CF(2.0, 0.7, 0.2, TOPH), TOPH, 54), K(S.shook - 0.05, CF(1.6, 0.5, 0.1, TOPH), TOPH, 48)])],
    [S.shook, cameraPath([                                                   // 10 the beams shake, dust pours, white-out, the candle burns on
      K(S.shook, CF(3.0, 1.5, 0.8), midFace, 58), K(T(118), V(-2.3, 4.4, -1.1), V(1.2, 6.5, 0.4), 62),
      K(T(127), CF(2.6, 1.1, 0.5), TOPH, 56), K(T(133), CF(0.9, 0.35, -0.05, FLAME), FLAME, 42), K(S.how - 0.05, CF(0.6, 0.25, -0.05, FLAME), FLAME, 36)])],
    [S.how, cameraPath([                                                     // 11 "But how?" snap to his face
      K(S.how, CF(1.55, 0.35, 0.05, TOPH), TOPH, 46), K(S.sci - 0.05, CF(1.25, 0.25, 0.03, TOPH), TOPH, 42)])],
    [S.sci, cameraPath([vw(SCI.pile, 0, 0, S.sci), vw(SCI.pile, 0.2, -4, S.puff - 0.05)])],       // 12a a pile barely burns
    [S.puff, cameraPath([vw(SCI.puff, 0, 0, S.puff), vw(SCI.puff, 0.18, -4, S.chain - 0.05)])],  // 12b specks wrapped in oxygen
    [S.chain, cameraPath([vw(SCI.chain, 0, 2, S.chain), vw(SCI.chain, -0.35, 8, S.warm - 0.05)])], // 12c the chain reaction
    [S.warm, cameraPath([                                                    // 13 back in the white room: the perfect cloud
      K(S.warm, CF(2.6, 1.3, 0.5), midFace, 58), K(T(197), CF(2.4, -0.4, 0.6), midFace, 56), K(S.boom - 0.05, CF(1.9, -1.2, 0.4), midFace, 52)])],
    [S.boom, cameraPath([                                                    // 14 BOOM: the roof flies off, the walls fold out
      K(S.boom, V(14, 3.0, 22), V(-1, 4.0, 0), 50), K(T(215), V(17, 6.5, 26), V(0, 7.5, 0), 58), K(S.flies - 0.05, V(19, 7.0, 28), V(-1, 5.0, 0), 56)])],
    [S.flies, cameraPath([                                                   // 15 he flies out the window into the river
      K(S.flies, V(-0.4, 5.0, 10.5), WIN, 50), K(T(231), V(0.4, 3.8, 12.8), WIN.clone().lerp(LAND, 0.45), 56),
      K(T(234), V(0.6, 0.6, 12.4), LAND.clone().add(V(0, 1.0, 0)), 50), K(S.real - 0.05, V(2.8, 0.55, 12.6), LAND.clone().add(V(1.6, 0.9, 0)), 46)])],
    [S.real, cameraPath([                                                    // 16 1878 (sepia): the far town hears it
      K(S.real, V(-16, 3.2, 10), V(10, 0.8, 18), 52), K(T(257), V(-13.5, 3.0, 11.5), V(12, 1.2, 19), 50), K(S.last - 0.05, V(-12.5, 2.9, 12.2), V(12, 1.4, 19), 48)])],
    [S.last, cameraPath([                                                    // 17 the foreman in front of the smoking ruins
      K(S.last, V(6.6, 2.3, 10.2), head(FM_OUT).add(V(-1.4, 0.9, -3.0)), 56),
      K(S.end, V(5.4, 2.0, 8.4), head(FM_OUT).add(V(-0.8, 0.45, -2.0)), 52)])],
  ];
  const segAt = (t) => { let i = 0; for (let k = 0; k < P.length; k++) if (t >= P[k][0]) i = k; return i; };

  const FBC = new THREE.CatmullRomCurve3(M.fireballPath);
  function camAt(t) {
    const c = P[segAt(t)][1](t);
    if (t >= S.whump && t < T(101)) {                                        // follow the fireball along the rafters
      const w = sm(S.whump, T(90), t) * (1 - sm(T(99), T(101), t));
      c.target = c.target.clone().lerp(FBC.getPoint(cl(fb(t) / 0.62, 0, 1)), w);
    }
    // exaggerated camera shake on the violent beats
    const amp = 0.05 * sm(T(90) - 0.05, T(90) + 0.05, t) * (1 - sm(T(92), T(93), t))
      + 0.06 * sm(S.shook + 0.1, T(112), t) * (1 - sm(T(117), T(119), t))
      + 0.18 * sm(S.boom - 0.02, S.boom + 0.06, t) * (1 - sm(S.boom + 0.6, S.boom + 1.6, t)) + 0.08 * sm(T(215), T(216), t) * (1 - sm(T(219), T(221), t))
      + 0.12 * sm(S.tease, S.tease + 0.06, t) * (1 - sm(S.tease + 0.4, S.rule, t));
    if (amp > 1e-4) { const s = shakeV(t, amp); c.pos = c.pos.clone().add(s); c.target = c.target.clone().add(s.multiplyScalar(0.5)); }
    // fov punch on accent words (snap zooms)
    const punch = [T(17), T(21), T(23), T(27), T(41), T(78), T(90), T(150), T(206)].reduce((a, w) => a + 4 * Math.exp(-Math.pow((t - w) / 0.09, 2)), 0);
    return { ...c, fov: c.fov - punch };
  }

  // ---- per-frame story state
  function act(t, live) {
    const cast = {}, props = {}, overlays = [], fx = { whip: 0, flash: 0, sepia: 0 }, ctrl = {};
    const z = zoneAt(t), cam = live.camPos();
    const blink = (ts) => (ts.some((b) => t >= b && t < b + 0.12) ? "_blink" : "");
    // transitions: whips/flashes at every cut
    const pulse = (c, a = 0.06, b = 0.16) => sm(c - a, c, t) * (1 - sm(c + 0.02, c + b, t));
    fx.whip = Math.max(pulse(S.rule), pulse(S.nos), pulse(T(22) - 0.02, 0.08, 0.12), pulse(T(24) - 0.02, 0.08, 0.12), pulse(S.laugh), pulse(S.night),
      pulse(S.sneak), pulse(S.how, 0.04, 0.12), pulse(S.sci), pulse(S.puff), pulse(S.chain), pulse(S.warm), pulse(S.flies), pulse(S.last));
    fx.flash = Math.max(sm(S.tease - 0.03, S.tease, t) * (1 - sm(S.tease + 0.02, S.tease + 0.12, t)), 0.9 * sm(S.boom - 0.03, S.boom, t) * (1 - sm(S.boom + 0.03, S.boom + 0.16, t)),
      0.8 * sm(S.real - 0.03, S.real, t) * (1 - sm(S.real + 0.02, S.real + 0.14, t)));
    fx.sepia = t >= S.real && t < S.last ? 1 : 0;

    // ---- world controls
    const boomK = cl((t - S.boom) / 2.5, 0, 1);
    ctrl.blast = t >= S.tease && t < S.rule ? 0.45 * sm(S.tease + 0.1, S.rule - 0.1, t) : t >= S.boom ? sm(S.boom + 0.05, T(222), t) : 0;
    ctrl.shake = t >= S.shook && t < T(120) ? sm(S.shook + 0.1, T(112), t) * (1 - sm(T(117), T(120), t)) : 0;
    ctrl.explosion = t >= S.tease && t < S.rule ? cl((t - S.tease) / 2.5, 0, 0.45) : t >= S.boom ? (t < S.real ? boomK : 0.93) : -1;
    ctrl.farBoom = t >= S.real && t < S.last ? cl((t - T(257) + 0.1) / 2.5, 0, 1) : -1;
    ctrl.candle = t < S.tease ? sm(T(2), T(2) + 0.25, t) : t >= T(64) && t < S.boom ? sm(T(64), T(64) + 0.3, t) : 0;
    ctrl.haze = z === "mill" && t < S.tease ? 0.75 : t >= T(58) && t < S.boom && z === "mill" ? 0.55 + 0.3 * sm(T(60), T(66), t) : 0;
    ctrl.sparks = t >= S.strange && t < S.whump + 0.3 ? sm(T(76), T(78), t) * (1 - sm(S.whump, S.whump + 0.3, t)) : 0;
    ctrl.fireball = t >= T(90) - 0.1 && t < S.shook ? fb(t) : -1;
    ctrl.dust = t >= T(118) && t < S.boom ? sm(T(118) - 0.3, T(126), t) : 0;
    ctrl.whiteout = t >= T(127) && t < S.boom ? (t < S.how ? 0.75 * sm(T(127), T(131), t) : t < S.warm ? 0.75 : 0.75 + 0.2 * sm(S.warm, T(201), t)) : 0;
    ctrl.science = { pile: sm(S.sci + 0.2, T(157), t), puff: sm(S.puff + 0.1, T(170), t), chain: 0.62 * sm(S.chain + 0.1, T(188), t) };
    ctrl.splash = t >= T(234) - 0.05 && t < S.real ? cl((t - T(234) + 0.05) / 1.2, 0, 1) : -1;
    ctrl.glassBroken = t >= S.boom;

    // ================= NEW GUY =================
    const R = { visible: true, pos: NG.clone(), rot: M.newGuyGround.yaw, s: { expression: "neutral" } };
    if (t < S.tease) {                                                       // hook: lighting the candle, grinning
      R.pos = TOP.clone(); R.rot = yTop;
      R.s = { expression: step([[0, "smug"], [0.9, "happy"]], t), lookAt: FLAME, mouth: blink([1.2]),
        armR: armAt([[0, { pose: "grab", target: FLAME.clone().add(V(0, 0.05, 0)) }], [0.9, { pose: "rest" }]], t, 0.3), armL: { pose: "hip" } };
    } else if (t < S.night) {                                                // day, ground floor
      if (t < S.rule) R.visible = false;
      const quote = t >= T(37) && t < E(43);
      R.s = { expression: step([[0, "smug"], [S.nos, "neutral"], [T(24), "worried"], [S.laugh, "laugh"], [T(37), "happy"], [T(42), "laugh"]], t),
        lookAt: t < S.laugh ? head(FM) : t < T(37) ? head(FM) : cam,
        mouth: quote ? visemeAt(WORDS, t) : t >= S.laugh && t < T(37) ? "_talk" : blink([3.9]),
        lean: t >= S.laugh && t < T(37) ? 0.2 + 0.08 * Math.sin(t * 18) : 0, bob: t >= S.laugh && t < T(37) ? 0.03 * Math.abs(Math.sin(t * 14)) : 0,
        armL: armAt([[0, { pose: "rest" }], [S.laugh, { pose: "slapKnee", phase: t * 5 }], [T(37), { pose: "hip" }]], t, 0.25),
        armR: armAt([[0, { pose: "rest" }], [T(24) - 0.1, { pose: "holdUp", height: 1.15 }], [S.laugh, { pose: "slapKnee", phase: t * 5 + 0.5 }],
          [T(39), { pose: "present" }], [T(43), { pose: "rest" }]], t, 0.22) };
      if (t >= T(24) - 0.1 && t < S.laugh) props.matchbox = { holder: "newguy", side: "R" };
    } else if (t < S.sneak) { R.visible = false;                             // outside, freezing
    } else if (t < S.boom) {                                                 // up the stairs, then the top floor
      const up = sm(S.sneak + 0.05, T(59), t), walk = sm(T(59), T(64) - 0.1, t);
      if (t < T(59)) { R.pos = SB.clone().lerp(ST, up); R.rot = faceTo(SB, ST); }
      else { R.pos = ST.clone().lerp(TOP, walk); R.rot = walk < 0.97 ? faceTo(ST, TOP) : yTop; }
      const moving = (t < T(64) - 0.1);
      const fireH = live.fireballHead ? live.fireballHead() : null;
      R.s = {
        expression: step([[0, "smug"], [T(68), "skeptical"], [T(78), "shock"], [T(79), "happy"], [S.whump, "shock"], [T(104), "laugh"], [S.shook, "neutral"],
          [T(112), "worried"], [T(127), "shock"], [T(132), "worried"], [S.how, "worried"], [T(201), "shock"]], t),
        mouth: t >= S.how && t < S.sci ? "_O" : t >= T(104) && t < S.shook ? "_talk" : blink([12.9, 15.0, 19.0, 26.4, 44.2]),
        lookAt: t < T(64) ? head(R.pos).add(fwd(R.rot).multiplyScalar(2)) : t >= S.whump && t < T(104) && fireH ? fireH
          : t >= S.shook && t < T(131) ? V(0.5, 6.4, -0.8) : t >= S.how && t < S.sci ? cam : FLAME,
        bob: moving ? 0.03 * Math.abs(Math.sin(t * 11)) : t >= T(104) && t < S.shook ? 0.025 * Math.abs(Math.sin(t * 13)) : 0,
        lean: t >= S.whump && t < T(92) ? -0.18 * sm(S.whump, T(90) + 0.1, t) * (1 - sm(T(92) - 0.3, T(92), t)) : moving ? 0.1 : 0,
        nod: t >= S.whump && t < T(92) ? 0.2 * sm(T(90), T(90) + 0.08, t) * (1 - sm(T(91), T(92), t)) : 0,
        armR: armAt([[0, { pose: "hold" }], [T(63) - 0.1, { pose: "grab", target: CANDLE.clone().add(V(0, 0.04, 0)) }], [T(64) + 0.05, { pose: "rest" }],
          [T(78), { pose: "present" }], [S.whump, { pose: "fistsUp", phase: t * 4 }], [T(104), { pose: "slapKnee", phase: t * 5 }], [S.shook, { pose: "rest" }],
          [T(127), { pose: "fistsUp", phase: t * 3 }], [S.how, { pose: "shrug" }], [S.sci, { pose: "rest" }], [T(201), { pose: "fistsUp", phase: t * 4 }]], t, 0.22),
        armL: armAt([[0, { pose: "rest" }], [S.whump, { pose: "fistsUp", phase: t * 4 + 0.4 }], [T(104), { pose: "hip" }], [S.shook, { pose: "rest" }],
          [S.how, { pose: "shrug" }], [S.sci, { pose: "rest" }], [T(201), { pose: "fistsUp", phase: t * 4 + 0.5 }]], t, 0.22),
      };
      props.candle = t < T(63) + 0.1 ? { holder: "newguy", side: "R" } : { place: CANDLE, rot: 0.3 };
    } else if (t < S.real) {                                                 // blown out of the window, into the river
      const fly = sm(T(230) - 0.02, T(234), t), p = WIN.clone().lerp(LAND, fly); p.y += Math.sin(Math.PI * fly) * 2.2;
      const drift = Math.max(0, t - T(234));
      if (t < T(230) - 0.02) R.visible = false;
      R.pos = t < T(234) ? p.add(V(0, -1.0, 0)) : LAND.clone().add(V(0.55 * drift, -0.95 + 0.04 * Math.sin(t * 3.1), 0.12 * drift));
      R.rot = t < T(234) ? Math.PI * 0.1 + fly * 2.2 : 0.35 + 0.15 * Math.sin(t * 0.9);
      R.s = { expression: t < T(234) ? "shock" : "sleepy", mouth: t < T(234) ? "_O" : blink([54.0]), lookAt: cam,
        lean: t < T(234) ? -0.5 : -0.25, side: t < T(234) ? 0.3 * Math.sin(t * 9) : 0.1 * Math.sin(t * 1.7),
        armL: { pose: t < T(234) ? "fistsUp" : "shrug", phase: t * 6 }, armR: { pose: t < T(234) ? "fistsUp" : "shrug", phase: t * 6 + 0.5 } };
    } else R.visible = false;
    if (t < S.tease) props.candle = { place: CANDLE, rot: 0.3 };            // the hook: the candle stands on the crate
    if (z === "science" || z === "outside" && !(t >= S.flies && t < S.real)) R.visible = false;
    cast.newguy = R;

    // ================= FOREMAN =================
    const F = { visible: false, pos: FM.clone(), rot: M.foremanSpot.yaw, s: {} };
    if (t >= S.rule && t < S.night) {
      F.visible = true;
      F.rot = t < S.nos ? faceTo(FM, SIGN) * 0.6 + M.foremanSpot.yaw * 0.4 : M.foremanSpot.yaw;
      F.s = { expression: step([[0, "skeptical"], [T(17) - 0.1, "angry"], [S.nos, "skeptical"], [S.laugh, "skeptical"], [T(41), "angry"]], t),
        lookAt: t < T(19) ? SIGN : t < S.nos ? cam : t < S.laugh ? head(NG) : head(NG), mouth: blink([5.3, 8.0]),
        armR: armAt([[0, { pose: "rest" }], [T(17) - 0.25, { pose: "push", target: SIGN.clone().add(V(0.05, 0, 0)), phase: 0 }], [T(19), { pose: "point", target: head(NG) }],
          [S.nos, { pose: "rest" }], [T(22) - 0.1, { pose: "holdUp", height: 1.25 }], [T(24), { pose: "point", target: head(NG, 1.0) }], [S.laugh, { pose: "fold" }]], t, 0.2),
        armL: armAt([[0, { pose: "hip" }], [S.laugh, { pose: "fold" }]], t, 0.25), tilt: t >= S.laugh ? 0.1 : 0 };
      if (t >= T(22) - 0.1 && t < T(24)) props.lantern = { holder: "foreman", side: "R" };
    } else if (t >= S.last) {
      F.visible = true; F.pos = FM_OUT.clone(); F.rot = yFmOut;
      F.s = { expression: step([[0, "skeptical"], [T(271), "smug"]], t), lookAt: t < T(271) ? cam : cam, mouth: blink([61.0]),
        armL: { pose: "fold" }, armR: { pose: "fold" }, tilt: 0.12 };
    }
    cast.foreman = F;

    // ================= CO-WORKER =================
    const C = { visible: t >= S.rule && t < S.night, pos: CW.clone(), rot: M.coworkerSpot.yaw, s: {} };
    C.s = { expression: step([[0, "sleepy"], [S.nos, "shock"], [T(22), "sleepy"], [S.laugh, "skeptical"]], t), lookAt: t < S.laugh ? head(FM) : head(NG),
      mouth: blink([3.0, 7.4]), armR: armAt([[0, { pose: "rest" }], [S.nos - 0.15, { pose: "holdUp", height: 1.2 }], [T(22), { pose: "rest" }]], t, 0.2), armL: { pose: "rest" } };
    if (t >= S.nos - 0.15 && t < T(22)) props.candle2 = { holder: "miller2", side: "R" };
    cast.miller2 = C;

    // ---- 2D gags (stamped red X on each banned thing, the 1878 title)
    if (t >= T(21) && t < T(22) + 0.05) overlays.push({ kind: "nope", at: head(CW, 1.2), t0: T(21) });
    if (t >= T(23) && t < T(24) + 0.05) overlays.push({ kind: "nope", at: head(FM, 1.35), t0: T(23) });
    if (t >= T(27) && t < S.laugh) overlays.push({ kind: "nope", at: head(NG, 1.15), t0: T(27) });
    if (t >= T(253) && t < S.last) overlays.push({ kind: "title", text: "1878", t0: T(253) });
    if (t >= T(41) && t < T(43) + 0.4) overlays.push({ kind: "flourPuff", at: head(NG, 1.3).add(V(0.25, 0, 0.3)), t0: T(41) });

    return { cast, props, overlays, fx, ctrl, zone: z };
  }

  function keyLightAt(t, z) {
    if (z === "mill" && (t < S.tease || (t >= T(64) && t < S.boom))) return FLAME.clone().add(V(0, 0.4, 0));
    return W.mill.keyLightPos;
  }
  return { camAt, act, keyLightAt, zoneAt, timeAt, S, BLAST, FLAME };
}
