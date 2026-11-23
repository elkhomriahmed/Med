// Video 4 direction: "If you leave a water bottle in your car" (script v1, 272 words, voice 61.6 s at ~4.4 words/s).
// VIDEO 3 FORMULA (STYLE_BIBLE): stake-first, a new framing ~every second, room-style orbits around the subject, shake on shocks,
// glide only inside the lot, designed whip/flash/sepia cuts with sound, one cool scheme + hot accents. Pure function of t.
import * as THREE from "three";
import WORDS from "../../public/audio/words_v04.json";
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
const K = (t, pos, target, fov = 52) => ({ t, pos: pos.clone(), target: target.clone(), fov });
const shakeV = (t, amp, f = 23) => V(Math.sin(t * f) * 0.6 + Math.sin(t * f * 1.7 + 1.3) * 0.4, Math.sin(t * f * 1.3 + 0.7) * 0.5, Math.sin(t * f * 0.9 + 2.1) * 0.4).multiplyScalar(amp);

// shot boundaries (each is a designed cut with an accent sound in sound_plan.py, unless noted "glide")
export const S = {
  hook: 0, warn: T(14), nos: T(24), laugh: T(38), toss: T(50), noon: T(65), strange: T(77), smoke: T(98), up: T(118),
  carPov: T(126), stairs: T(130), lot: T(135), ring: T(144), how: T(156), sci: T(166), focus: T(177), melt: T(202),
  oven: T(216), rips: T(228), real: T(240), last: T(262), end: END,
};
export const FLASHBACK = S.real;

export function zoneAt(t) {
  if (t >= S.sci && t < S.oven) return "optics";
  if (t >= S.stairs && t < S.lot) return "stairs";
  return "lot";
}

export function makeDirection(W) {
  const L = W.lot.anchors, CAR = W.car, CA = CAR.anchors, OPT = W.optics.anchors.views;
  const carW = (v) => v.clone().applyMatrix4(CAR.matrixWorld);
  const head = (p, h = 1.42) => p.clone().add(V(0, h, 0));
  const fwd = (yaw) => V(Math.sin(yaw), 0, Math.cos(yaw));
  const cv = (name) => { const v = CA.views[name]; return { pos: carW(v.pos), target: carW(v.target), fov: v.fov }; };
  const SEAT = carW(CA.seatBurnPoint), SEATC = carW(CA.driverSeatTop).add(V(0, 0.35, 0));
  const DOOR = carW(CA.driverDoorOpenSpot), yDoor = CA.driverDoorOpenYaw;
  const WS = cv("throughWindshield"), SIDE = cv("sideWindow"), DOV = cv("doorOpen");
  const CW = L.coworkerSpot.pos.clone(), yCW = L.coworkerSpot.yaw;
  const DRV_ROOM = CW.clone().add(V(0.95, 0, -0.12));                       // he stands beside her inside the office
  const LAUGH_AT = V(0.75, 0, -3.45);                                       // beside the open door, facing the camera side
  const WALK = L.walkPath.map((p) => p.clone());                            // car -> entrance
  const along = (pts, k) => {                                               // point at fraction k along a polyline
    let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = pts[i].distanceTo(pts[i - 1]); seg.push(d); tot += d; }
    let d = cl(k, 0, 1) * tot; for (let i = 1; i < pts.length; i++) { if (d <= seg[i - 1]) return pts[i - 1].clone().lerp(pts[i], d / seg[i - 1]); d -= seg[i - 1]; }
    return pts[pts.length - 1].clone();
  };
  const STRUG = carW(V(-1.1, 0, 0.12));                                     // pressed against the driver window (keys gone, door locked)
  const RUN = [...WALK].reverse().concat([STRUG.clone()]);                  // entrance -> the driver window
  const runK = (t) => sm(S.lot - 0.02, T(150), t);
  const runner = (t) => along(RUN, runK(t));
  const orb = (th, r, h, c = SEATC) => c.clone().add(V(Math.sin(th) * r, h, Math.cos(th) * r));
  const vw = (v, push, dfov, t) => K(t, v.pos.clone().lerp(v.target, push), v.target, v.fov + dfov);

  const P = [
    [S.hook, cameraPath([K(0, orb(-2.7, 5.6, 0.9), SEATC, 46), K(S.warn - 0.03, WS.pos, SEAT, 30)])],
    [S.warn, cameraPath([K(S.warn, V(-6.8, 1.7, 5.8), V(0.8, 2.3, -10.5), 50), K(S.nos - 0.03, V(-5.9, 1.65, 4.7), V(0.9, 2.5, -10.5), 47)])],   // building, cars, people arriving (no empty sky)
    [S.nos, cameraPath([                                                     // 3 three inserts through the windshield (whips between)
      K(S.nos, carW(V(0.3, 1.12, 0.25)), carW(V(-0.1, 0.97, -0.72)), 40), K(T(29) - 0.04, carW(V(0.25, 1.1, 0.12)), carW(V(-0.1, 0.97, -0.72)), 36),
      K(T(29), carW(V(-0.15, 1.15, -0.45)), carW(V(0.4, 0.62, 0.05)), 44), K(T(32) - 0.04, carW(V(-0.1, 1.1, -0.38)), carW(V(0.4, 0.62, 0.05)), 40),
      K(T(32), carW(V(0.05, 1.12, 0.2)), carW(V(0.3, 0.98, -0.75)), 40), K(S.laugh - 0.03, carW(V(0.1, 1.1, 0.08)), carW(V(0.3, 0.98, -0.75)), 34)])],
    [S.laugh, cameraPath([K(S.laugh, V(-1.5, 1.05, -2.2), head(LAUGH_AT, 1.3), 52), K(T(44), V(-1.25, 1.08, -2.5), head(LAUGH_AT, 1.32), 48),
      K(S.toss - 0.03, V(-1.05, 1.1, -2.75), head(LAUGH_AT, 1.32), 46)])],
    [S.toss, cameraPath([K(S.toss, V(-0.9, 1.75, -0.6), SEAT.clone().lerp(head(LAUGH_AT, 1.0), 0.45), 50), K(T(57), V(-1.1, 1.7, -0.9), carW(V(-0.84, 0.9, 0)), 48),
      K(T(61), V(-1.6, 1.8, -0.4), head(along(WALK, 0.12), 1.1), 54), K(S.noon - 0.03, V(-1.9, 1.9, -1.4), head(along(WALK, 0.2), 1.1), 56)])],
    [S.noon, cameraPath([vw(L.views.lotWide, 0, 0, S.noon), vw(L.views.lotWide, 0.12, -2, S.strange - 0.03)])],
    [S.strange, cameraPath([K(S.strange, WS.pos, WS.target, 34), K(T(84), WS.pos.clone().lerp(WS.target, 0.15), SEAT, 24),
      K(T(90), WS.pos.clone().lerp(WS.target, 0.22).add(V(0.15, 0, 0)), SEAT, 18), K(S.smoke - 0.03, WS.pos.clone().lerp(WS.target, 0.26).add(V(-0.12, 0, 0)), SEAT, 16)])],
    [S.smoke, cameraPath([K(S.smoke, orb(Math.PI + 0.55, 2.9, 2.0), SEAT.clone().add(V(0, 0.15, 0)), 34), K(T(104), orb(Math.PI + 0.15, 2.8, 2.05), SEAT.clone().add(V(0, 0.2, 0)), 32),     // the loved orbit, across the front of the car, looking down through the windshield
      K(T(110), orb(Math.PI - 0.25, 2.8, 2.1), SEAT.clone().add(V(0, 0.25, 0)), 32), K(S.up - 0.03, orb(Math.PI - 0.6, 3.0, 2.2), SEAT.clone().add(V(0, 0.3, 0)), 34)])],
    [S.up, cameraPath([K(S.up, L.windowCenter.clone().add(V(0.6, -0.15, 6.5)), L.windowCenter.clone().add(V(0.2, -0.3, 0)), 34), K(S.carPov - 0.03, L.windowCenter.clone().add(V(0.4, -0.15, 5.4)), L.windowCenter.clone().add(V(0.2, -0.3, 0)), 32)])],   // level with the window: heads + hair readable
    [S.carPov, cameraPath([K(S.carPov, L.windowCenter.clone().add(V(0.3, 0.1, 0.45)), SEATC, 40), K(S.stairs - 0.03, L.windowCenter.clone().add(V(0.3, 0.05, 0.6)), SEATC, 32)])],
    [S.stairs, cameraPath([vw(L.views.stairsDown, 0, 0, S.stairs), vw(L.views.stairsBottom, 0, 0, S.lot - 0.03)])],
    [S.lot, cameraPath([0, 0.25, 0.5, 0.75, 1].map((f) => { const t = S.lot + f * (S.ring - S.lot - 0.03), p = runner(t), d = fwd(faceTo(p, along(RUN, runK(t) + 0.05)));
      return K(t, p.clone().addScaledVector(d, 2.6).add(V(0.6, 1.3, 0)), head(p, 1.0), 54); })) ],
    [S.ring, cameraPath([K(S.ring, carW(V(0.62, 0.92, 0.42)), carW(V(-0.8, 0.86, -0.05)), 62), K(T(150), carW(V(0.6, 0.92, 0.4)), carW(V(-0.9, 0.96, -0.04)), 60),     // passenger-seat POV (low, under the headrest line)
      K(S.how - 0.03, carW(V(0.58, 0.93, 0.38)), carW(V(-0.95, 1.02, -0.03)), 56)])],
    [S.how, cameraPath([K(S.how, carW(V(0.45, 0.95, 0.3)), carW(V(-1.0, 1.05, -0.02)), 50), K(S.sci - 0.03, carW(V(0.38, 0.96, 0.27)), carW(V(-1.0, 1.06, -0.02)), 46)])],
    [S.sci, cameraPath([vw(OPT.rays, 0, 0, S.sci), vw(OPT.rays, 0.15, -3, S.focus - 0.03)])],
    [S.focus, cameraPath([vw(OPT.focus, -0.1, 2, S.focus), vw(OPT.focus, 0.2, -4, S.melt - 0.03)])],
    [S.melt, cameraPath([vw(OPT.melt, 0, 0, S.melt), vw(OPT.melt, 0.15, -3, S.oven - 0.03)])],
    [S.oven, cameraPath([K(S.oven, WS.pos.clone().add(V(0.4, -0.6, -0.3)), SEATC, 34), K(S.rips - 0.03, WS.pos.clone().add(V(-0.3, -0.7, -0.1)), SEATC, 30)])],
    [S.rips, cameraPath([K(S.rips, carW(V(-6.3, 2.15, 1.15)), carW(V(-0.6, 0.9, -0.05)), 40), K(T(237), carW(V(-6.2, 2.12, 1.12)), carW(V(-0.7, 0.9, -0.05)), 40),   // from behind him
      K(S.real - 0.03, carW(V(-6.3, 2.2, 1.15)), carW(V(-1.6, 0.7, 0.05)), 44)])],
    [S.real, cameraPath([K(S.real, DOV.pos, DOV.target, DOV.fov + 2), K(T(256), DOV.pos.clone().lerp(DOV.target, 0.1), DOV.target, DOV.fov),
      K(T(257), WS.pos, WS.target, 26), K(S.last - 0.03, WS.pos.clone().lerp(WS.target, 0.2), SEAT, 18)])],
    [S.last, cameraPath([K(S.last, head(DOOR).add(V(-3.3, -0.2, 0.9)), head(DOOR, 1.15), 50), K(T(268), head(DOOR).add(V(-2.8, -0.25, 0.75)), head(DOOR, 1.1), 48),
      K(S.end, head(DOOR).add(V(-2.3, -0.3, 0.6)), head(DOOR, 0.98), 46)])],
  ];
  const segAt = (t) => { let i = 0; for (let k = 0; k < P.length; k++) if (t >= P[k][0]) i = k; return i; };

  function camAt(t) {
    const c = P[segAt(t)][1](t);
    const amp = 0.035 * sm(T(57), T(57) + 0.05, t) * (1 - sm(T(58), T(59), t))                        // door slam
      + 0.03 * sm(T(91) - 0.05, T(91), t) * (1 - sm(T(92), T(92) + 0.3, t))                             // "Burning."
      + 0.05 * sm(S.how - 0.02, S.how + 0.05, t) * (1 - sm(S.how + 0.3, S.how + 0.6, t))                // shock: how?
      + 0.2 * sm(T(237) - 0.03, T(237) + 0.05, t) * (1 - sm(T(237) + 0.5, T(239) + 0.3, t));           // seat bursts into flames (bigger hit)
    if (amp > 1e-4) { const s = shakeV(t, amp); c.pos = c.pos.clone().add(s); c.target = c.target.clone().add(s.multiplyScalar(0.5)); }
    const punch = [T(13), T(25), T(30), T(32), T(45), T(84), T(90), T(91), T(155), T(165), T(190), T(201), T(237), T(270)]
      .reduce((a, w) => a + 4 * Math.exp(-Math.pow((t - w) / 0.09, 2)), 0);
    return { ...c, fov: c.fov - punch };
  }

  function act(t, live) {
    const cast = {}, props = {}, overlays = [], fx = { whip: 0, flash: 0, sepia: 0, red: 0 }, ctrl = {};
    const z = zoneAt(t), cam = live.camPos();
    const blink = (ts) => (ts.some((b) => t >= b && t < b + 0.12) ? "_blink" : "");
    const pulse = (c, a = 0.06, b = 0.16) => sm(c - a, c, t) * (1 - sm(c + 0.02, c + b, t));
    fx.whip = Math.max(pulse(S.warn), pulse(S.nos), pulse(T(29), 0.05, 0.12), pulse(T(32), 0.05, 0.12), pulse(S.laugh), pulse(S.toss), pulse(S.noon),
      pulse(S.strange), pulse(S.smoke), pulse(S.up), pulse(S.carPov, 0.05, 0.12), pulse(S.stairs), pulse(S.lot), pulse(S.ring), pulse(S.how, 0.04, 0.12),
      pulse(S.sci), pulse(S.focus), pulse(S.melt), pulse(S.oven), pulse(S.rips), pulse(S.last));
    fx.flash = 0.8 * sm(S.real - 0.03, S.real, t) * (1 - sm(S.real + 0.02, S.real + 0.14, t));
    fx.sepia = t >= S.real && t < S.last ? 1 : 0;
    fx.red = [T(24), T(29), T(32)].reduce((m, w) => Math.max(m, t >= w - 0.04 ? sm(w - 0.04, w + 0.03, t) * Math.exp(-Math.max(0, t - w - 0.03) / 0.28) : 0), 0);

    // ---- car + burn controls
    ctrl.door = t < S.warn ? 0 : t < S.toss ? 1 : t < T(57) ? 1 - sm(T(57) - 0.08, T(57) + 0.1, t) : t < S.rips ? 0 : t < S.last ? sm(T(229) - 0.05, T(232), t) : 1;
    ctrl.burn = { dot: 0, smoke: 0, scorch: 0, ring: 0, fire: 0 };
    if (t < S.warn) ctrl.burn = { dot: 0.3, smoke: 0.85, scorch: 1, ring: 0.9, fire: 0.06 };                     // flash-forward
    else if (t >= S.strange && t < S.real) {
      ctrl.burn = { dot: sm(T(84) - 0.1, T(84) + 0.15, t), smoke: sm(T(100) - 0.1, T(103), t), scorch: sm(T(106) - 0.1, T(107), t) * 0.55 + 0.45 * sm(S.ring, T(155), t),
        ring: sm(T(148), T(155), t), fire: t >= T(237) - 0.08 ? 0.25 * sm(T(237) - 0.08, T(237) + 0.1, t) + 0.75 * sm(T(237) + 0.1, T(239), t) : 0 };
    } else if (t >= S.real && t < S.last) ctrl.burn = { dot: 0.2, smoke: sm(S.real + 0.3, T(252), t), scorch: 0.5, ring: 0.2, fire: 0 };       // 2017: smoke only
    else if (t >= S.last) ctrl.burn = { dot: 0, smoke: 0.35, scorch: 1, ring: 0.15, fire: 0 };                                               // later: put out, smoking
    ctrl.haze = t >= S.oven && t < S.rips ? sm(S.oven, S.oven + 0.4, t) : t >= S.strange && t < S.up ? 0.35 : 0;
    ctrl.optics = { rays: sm(S.sci + 0.1, T(176), t), focus: sm(S.focus, T(190), t), scorch: sm(T(205) - 0.1, T(206), t), melt: sm(T(207) - 0.1, T(208) + 0.2, t), foam: sm(T(210), T(212) + 0.2, t) };
    ctrl.chestDot = t >= T(268) ? sm(T(268) - 0.05, T(270), t) : 0;

    // ================= THE NEW GUY =================
    const D = { visible: true, pos: LAUGH_AT.clone(), rot: faceTo(LAUGH_AT, V(-1.4, 0, -1.2)), s: {} };
    if (t < S.laugh) { D.visible = false; }
    else if (t < S.noon) {                                                   // laughs with the bottle, tosses it in, slams the door, walks off
      const walk = sm(T(60), S.noon + 0.6, t);
      if (t >= T(60)) { D.pos = along(WALK, walk * 0.35); D.rot = faceTo(D.pos, along(WALK, walk * 0.35 + 0.05)); }
      else if (t >= S.toss) D.rot = faceTo(LAUGH_AT, SEAT);
      const quote = t >= T(44) && t < E(49);
      D.s = { expression: step([[0, "laugh"], [T(44), "happy"], [S.toss, "smug"], [T(60), "happy"]], t), lookAt: t < S.toss ? cam : t < T(60) ? SEAT : head(D.pos).addScaledVector(fwd(D.rot), 3),
        mouth: quote ? visemeAt(WORDS, t) : t < T(44) ? "_talk" : blink([10.0]),
        lean: t < T(44) ? 0.18 + 0.06 * Math.sin(t * 18) : 0, bob: t < T(44) ? 0.03 * Math.abs(Math.sin(t * 14)) : t >= T(60) ? 0.025 * Math.abs(Math.sin(t * 10)) : 0,
        armR: armAt([[0, { pose: "holdUp", height: 1.25 }], [S.toss - 0.1, { pose: "present" }], [T(54), { pose: "rest" }], [T(56), { pose: "push", target: carW(V(-0.86, 0.9, 0.2)), phase: 0 }], [T(60), { pose: "rest" }]], t, 0.18),
        armL: armAt([[0, { pose: "slapKnee", phase: t * 5 }], [T(44), { pose: "hip" }], [T(60), { pose: "rest" }]], t, 0.22) };
      if (t < S.toss + 0.05) props.bottle = { holder: "driver", side: "R" };
      else if (t < T(54)) props.bottle = { arc: { from: "hand", k: sm(S.toss + 0.05, T(54), t) } };
      else props.bottle = { seat: true };
    } else if (t < S.up) { D.visible = false; props.bottle = { seat: true }; }
    else if (t < S.stairs) {                                                 // in the office beside the coworker
      D.pos = DRV_ROOM.clone(); D.rot = t < T(129) ? yCW + 0.25 : yCW;
      D.s = { expression: step([[0, "neutral"], [T(129), "shock"]], t), lookAt: t < T(127) ? head(CW, 1.35) : WS.target, mouth: t >= T(129) ? "_O" : blink([26.9]),
        armL: { pose: "rest" }, armR: { pose: "rest" } };
      props.bottle = { seat: true };
    } else if (t < S.lot) {                                                  // down the stairs
      const k = sm(S.stairs + 0.02, S.lot - 0.02, t); D.pos = L.stairTop.pos.clone().lerp(L.stairBottom.pos, k); D.rot = faceTo(L.stairTop.pos, L.stairBottom.pos);
      D.s = { expression: "shock", mouth: "_O", lookAt: head(D.pos).addScaledVector(fwd(D.rot), 3), bob: 0.04 * Math.abs(Math.sin(t * 16)), lean: 0.2,
        armL: { pose: "fistsUp", phase: t * 8 }, armR: { pose: "fistsUp", phase: t * 8 + 0.5 } };
      props.bottle = { seat: true };
    } else if (t < S.rips + 0.02) {                                          // across the lot, keys flying; at the car by "how"
      const p = runner(t); D.pos = p; D.rot = runK(t) < 0.99 ? faceTo(p, along(RUN, runK(t) + 0.03)) : yDoor;
      const running = runK(t) < 0.99;
      D.s = { expression: step([[0, "shock"], [S.how, "shock"], [S.sci, "worried"]], t), mouth: running || (t >= S.how && t < S.sci) ? "_O" : blink([40.0, 46.0]),
        lookAt: running ? head(p).addScaledVector(fwd(D.rot), 3) : t >= S.how && t < S.sci ? cam : SEAT,
        bob: running ? 0.045 * Math.abs(Math.sin(t * 15)) : 0, lean: running ? 0.22 : 0,
        armL: running ? { pose: "fistsUp", phase: t * 8 } : { pose: "shrug" }, armR: running ? { pose: "fistsUp", phase: t * 8 + 0.5 } : { pose: "shrug" } };
      if (runK(t) >= 0.99) {                                                 // at the window: tugging the locked door, pounding the glass, terrified
        D.pos = STRUG.clone().add(V(0, -0.18, 0)); D.rot = yDoor;   // crouched so his face is against the glass
        const handle = CAR.getDoorHandle(new THREE.Vector3()).applyMatrix4(CAR.matrixWorld);
        D.s = { expression: step([[0, "shock"], [S.how + 0.4, "worried"], [S.sci, "shock"]], t), mouth: "_O", lookAt: SEAT,
          lean: 0.28 + 0.05 * Math.sin(t * 13), side: 0.04 * Math.sin(t * 9), bob: 0.015 * Math.abs(Math.sin(t * 11)), sit: 0.35, seat: 0.75,
          armR: { pose: "grab", target: handle.add(V(-0.04 * Math.abs(Math.sin(t * 10)), 0, 0)) },
          armL: { pose: "push", target: carW(V(-0.88, 1.18, 0.02)), phase: t * 4.5 } };
      }
      props.bottle = { seat: true };
      if (t >= T(138)) props.keys = { fly: sm(T(138), T(139) + 0.25, t), from: runner(T(138)).add(V(0, 1.0, 0)), to: runner(T(138)).add(V(-0.9, 0.01, 0.6)) };
    } else if (t < S.real) {                                                 // rips the door open, the seat bursts: the blast throws him back hard (seen from behind)
      const step2 = sm(S.rips, T(230), t), e = sm(T(237) - 0.02, T(237) + 0.38, t), land = sm(T(237) + 0.3, T(237) + 0.45, t);
      D.pos = STRUG.clone().lerp(DOOR, step2).add(V(-1.75 * e, Math.sin(Math.PI * Math.min(1, e * 1.05)) * 0.45, 0.2 * e)); D.rot = yDoor;
      D.s = { expression: t < T(237) ? "worried" : "shock", mouth: t >= T(237) ? "_O" : blink([51.6]), lookAt: SEAT,
        lean: t < T(237) ? 0.08 : -0.75 * e + 0.35 * land, sit: land, seat: 0.06, side: 0.15 * e * (1 - land),
        armR: armAt([[0, { pose: "grab", target: CAR.getDoorHandle(new THREE.Vector3()).applyMatrix4(CAR.matrixWorld) }], [T(237) - 0.05, { pose: "fistsUp", phase: t * 7 }]], t, 0.1),
        armL: armAt([[0, { pose: "rest" }], [T(237) - 0.05, { pose: "fistsUp", phase: t * 7 + 0.5 }]], t, 0.1) };
      props.bottle = { seat: true };
    } else if (t < S.last) { D.visible = false; props.bottle = { seat: true }; }
    else {                                                                   // the button: he holds the rescued bottle; the sun puts a dot on his own shirt
      D.pos = DOOR.clone().add(V(-0.55, 0, 0.25)); D.rot = faceTo(D.pos, V(-3.5, 0, -2.0));
      D.s = { expression: step([[0, "skeptical"], [T(264), "smug"], [T(270), "shock"]], t), lookAt: t < T(268) ? cam : t < T(270) + 0.2 ? head(D.pos, 0.95).addScaledVector(fwd(D.rot), 0.3) : cam,
        mouth: t >= T(270) ? "_O" : blink([59.5]), armR: { pose: "holdUp", height: 1.02 }, armL: { pose: "hip" }, tilt: 0.08 };
      props.bottle = { holder: "driver", side: "R", upright: true };
    }
    if (z !== "lot" && !(z === "stairs")) D.visible = false;
    if (z === "stairs" && !(t >= S.stairs && t < S.lot)) D.visible = false;
    cast.driver = D;

    // ================= COWORKER (office window) =================
    cast.coworker = { visible: t >= S.up && t < S.stairs || t >= S.smoke && t < S.up, pos: CW.clone(), rot: yCW,
      s: { expression: step([[0, "neutral"], [T(125), "shock"]], t), lookAt: t < T(125) ? WS.target : t < T(127) ? head(DRV_ROOM, 1.35) : WS.target,
        mouth: t >= T(125) && t < E(129) ? visemeAt(WORDS, t) : blink([26.4]), armR: { pose: "holdUp", height: 1.2 }, armL: armAt([[0, { pose: "rest" }], [T(127), { pose: "point", target: SEAT }]], t, 0.2) } };
    if (cast.coworker.visible) props.mug = { holder: "coworker", side: "R" };

    // ================= IDAHO MAN (2017 flashback, sepia) =================
    cast.idahoMan = { visible: t >= S.real && t < S.last, pos: DOOR.clone(), rot: yDoor * 0.45 + faceTo(DOOR, DOV.pos) * 0.55,   // 3/4 toward the camera (face readable)
      s: { expression: step([[0, "skeptical"], [T(251), "shock"]], t), lookAt: SEAT, mouth: t >= T(251) ? "_O" : blink([55.0]), lean: 0.12, armR: { pose: "rest" }, armL: { pose: "hip" } } };

    // ================= MORNING EXTRAS: coworkers crossing the lot into the office (none at noon: "not a single person in sight") =================
    const ROUTE = (from) => [from, V(0.45, 0, -1.0), V(0.15, 0, -7.2), V(0, 0.15, -12.9)];
    for (const [name, from, t0, t1] of [["extraSuit", V(-10.0, 0, 0.8), 0.2, 9.6], ["extraTeal", V(9.0, 0, 5.0), 2.0, 11.6], ["extraBlue", V(5.4, 0, 1.2), -1.5, 6.4]]) {
      const k = sm(t0, t1, t), route = ROUTE(from), p = along(route, k), ahead = along(route, Math.min(1, k + 0.03));
      cast[name] = { visible: t < S.noon && k > 0 && k < 0.985 && z === "lot", pos: p, rot: faceTo(p, ahead),
        s: { expression: name === "extraTeal" ? "happy" : "neutral", lookAt: head(p).addScaledVector(fwd(faceTo(p, ahead)), 3), bob: 0.022 * Math.abs(Math.sin(t * 9 + t0)),
          mouth: blink([t0 + 2.3]), armL: { pose: name === "extraSuit" ? "hold" : "rest" }, armR: { pose: name === "extraBlue" ? "hip" : "rest" } } };
    }

    // ---- the three banned things (inserts)
    if (t >= S.nos && t < S.laugh) { props.lighter = true; props.spray = true; props.shades = { melt: sm(T(33), S.laugh, t) }; }
    if (t >= T(245) && t < S.last) overlays.push({ kind: "title", text: "2017", t0: T(245) });
    return { cast, props, overlays, fx, ctrl, zone: z };
  }

  function keyLightAt() { return W.lot.keyLightPos; }
  return { camAt, act, keyLightAt, zoneAt, S, SEAT, DOOR, FLASHBACK };
}
