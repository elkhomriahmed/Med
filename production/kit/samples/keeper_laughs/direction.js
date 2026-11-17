// Shot direction for the sample: video 1, "The old keeper laughs. 'Son, I've turned that lens by hand for 30 years.
// You can't float glass on metal,' but it works."  Everything is keyed to word times (voice sped up 1.18x, ~3.8 words/s).
import * as THREE from "three";
import WORDS_ALL from "../../public/audio/words_118.json";
import { viseme, step, keyed } from "../../timeline/lipsync.js";

export const FPS = 30;
export const SEG_START = 16.3;                                   // seconds into vo_118.wav
const FIRST = 66, LAST = 88;
export const WORDS = WORDS_ALL.slice(FIRST, LAST + 1).map(([a, b, w]) => [a - SEG_START, b - SEG_START, w]);
export const DURATION = Math.ceil((WORDS[WORDS.length - 1][1] + 0.3) * FPS);   // ends ~0.3 s after the last word
const T = (i) => WORDS[i - FIRST][0];                             // start time of word index i (global index)
const E = (i) => WORDS[i - FIRST][1];
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---- sound: story sounds on their words, soft whooshes on camera moves (STYLE_BIBLE 4b, S1)
export const SFX = [
  { src: "sfx/laughter_small_group.mp3", at: T(69) - 0.05, volume: 0.32, trimEnd: 1.0 },
  { src: "sfx/whoosh.mp3", at: T(70) - 0.25, volume: 0.22, trimEnd: 0.6 },
  { src: "sfx/clock_ticking.mp3", at: T(75), volume: 0.35, trimEnd: 0.9 },
  { src: "sfx/whoosh.mp3", at: T(80) - 0.25, volume: 0.22, trimEnd: 0.6 },
  { src: "sfx/glass_clink.mp3", at: T(83), volume: 0.35, trimEnd: 0.6 },
  { src: "sfx/whoosh.mp3", at: T(86) - 0.3, volume: 0.25, trimEnd: 0.6 },
  { src: "sfx/bell_ding.mp3", at: T(88), volume: 0.3, trimEnd: 1.0 },
  { src: "sfx/ocean_waves.mp3", at: 0, volume: 0.10 },          // ambience bed for the lighthouse
  { src: "sfx/wind.mp3", at: 0, volume: 0.06 },
];

// ---- acting. ctx = { lens, keeperHead, engineerHead } world positions (Vector3)
export function acting(t, ctx) {
  const K = {}, G = {};
  // KEEPER: laughs -> "Son," turns to the kid -> thumb to chest "I've" -> points at the lens "lens" -> cranks "by hand"
  // -> finger up "30 years" -> wags a finger at him "You can't float glass on metal" -> turns to the spinning lens, jaw drops "but it works".
  K.expression = step([[0, "laugh"], [T(70) - 0.05, "smug"], [T(74) - 0.1, "neutral"], [T(77) - 0.1, "proud"], [T(80) - 0.1, "skeptical"],
    [T(84), "smug"], [T(86), "neutral"], [T(88) - 0.08, "shock"]], t, "neutral");
  K.gaze = step([[0, ""], [T(70) - 0.2, "_L"], [T(74) - 0.1, ""], [T(76), "_L"], [T(86), ""]], t, "");
  const talking = t >= T(70) && t < E(85);
  K.mouth = talking ? viseme(WORDS, t, 70 - FIRST, 85 - FIRST) : "";
  if (!talking && [0.9, 3.3].some((b) => t >= b && t < b + 0.12)) K.mouth = "_blink";
  K.turn = keyed([[0, 0.25, 0.2], [T(70), 0.55, 0.25], [T(74), 0.3, 0.25], [T(76), 0.5, 0.25], [T(86), 0.15, 0.3]], t);
  K.lean = keyed([[0, -0.08, 0.2], [T(69), 0.12, 0.2], [T(70), 0.0, 0.25], [T(80), 0.10, 0.2], [T(84), -0.02, 0.25], [T(88), -0.12, 0.2]], t);
  K.nod = keyed([[0, -0.06, 0.2], [T(70), 0.06, 0.2], [T(78), -0.08, 0.2], [T(80), 0.06, 0.2], [T(88), -0.12, 0.15]], t);
  K.tilt = keyed([[0, 0.08, 0.2], [T(70), -0.05, 0.2], [T(78), 0.10, 0.2], [T(83), 0.12, 0.2], [T(86), 0.0, 0.2]], t);
  const laughShake = t < T(70) - 0.15 ? Math.max(0, 1 - t / (T(70) - 0.15)) : 0;
  K.bob = 0.012 * laughShake * Math.sin(t * 2 * Math.PI * 6.5) + 0.004 * Math.sin(t * 2.2);
  K.side = 0.02 * Math.sin(t * 1.3);
  // keeper's left hand (armL) is on the lens / engineer side
  const lensPt = ctx.lens.clone().add(V(-0.12, 0.05, 0.25));
  if (t < T(70) - 0.1) K.armL = { pose: "hip" };
  else if (t < T(71) - 0.05) K.armL = { pose: "rest", target: ctx.engineerHead.clone().add(V(-0.25, -0.45, 0.2)) };   // "Son," reaching out
  else if (t < T(74) - 0.08) K.armL = { pose: "thumbChest" };
  else if (t < T(75)) K.armL = { pose: "point", target: lensPt };
  else if (t < T(77) - 0.05) {                                                    // crank circles "by hand"
    const a = (t - T(75)) * 2 * Math.PI * 1.8;
    K.armL = { pose: "grab", target: ctx.keeperHead.clone().add(V(0.32 + 0.07 * Math.cos(a), -0.55 + 0.07 * Math.sin(a), 0.25)) };
  } else if (t < T(80) - 0.05) K.armL = { pose: "fingerUp" };
  else if (t < T(86) - 0.05) {                                                    // finger wag at the engineer
    K.armL = { pose: "point", target: ctx.engineerHead.clone().add(V(-0.35 + 0.05 * Math.sin((t - T(80)) * 2 * Math.PI * 2.6), -0.15, 0.25)) };
  } else K.armL = { pose: "shrug" };
  K.armR = t < T(70) - 0.1 ? { pose: "hip" } : t >= T(86) - 0.05 ? { pose: "shrug" } : { pose: "rest" };

  // ENGINEER: polite, unbothered; side-eyes the keeper, nods along to "30 years", folds his arms, then presents the lens on "but it works".
  G.expression = step([[0, "happy"], [T(69), "laugh"], [T(70) - 0.2, "skeptical"], [T(72), "neutral"], [T(74), "smug"],
    [T(80), "skeptical"], [T(82), "smug"], [T(86), "happy"], [T(88) - 0.05, "proud"]], t, "neutral");
  G.gaze = step([[0, "_R"], [T(72), ""], [T(74), "_R"], [T(86), ""]], t, "");
  G.mouth = [1.6, 4.1].some((b) => t >= b && t < b + 0.12) ? "_blink" : "";
  G.turn = keyed([[0, -0.4, 0.2], [T(86), -0.15, 0.3]], t);
  G.nod = keyed([[0, 0.0, 0.2], [T(77), 0.10, 0.15], [T(78), -0.03, 0.15], [T(79), 0.08, 0.15], [T(80), 0.0, 0.15]], t);
  G.tilt = keyed([[0, -0.06, 0.2], [T(70), 0.12, 0.2], [T(72), -0.04, 0.2], [T(80), 0.10, 0.2], [T(85), -0.06, 0.2]], t);
  G.lean = keyed([[0, 0.0, 0.2], [T(70), -0.08, 0.2], [T(72), 0.0, 0.2]], t);
  G.bob = 0.004 * Math.sin(t * 2.0 + 1.7); G.side = -0.02 * Math.sin(t * 1.1);
  if (t < T(80)) { G.armL = { pose: "rest" }; G.armR = { pose: "rest" }; }
  else if (t < T(86) - 0.05) { G.armL = { pose: "fold" }; G.armR = { pose: "fold" }; }
  else { G.armR = { pose: "point", target: ctx.lens.clone().add(V(0.15, 0.1, 0.25)) }; G.armL = { pose: "rest" }; }   // engineer's right hand is on the lens side
  return { keeper: K, engineer: G };
}

// ---- camera: one continuous move per shot, a new framing about every 1.5-2 s (fast pace), critically damped glide between
// framings (never stops dead). Framing = [time, focus point, distance, azimuth offset (rad), height offset]
export function framings(ctx) {
  const mid = ctx.keeperHead.clone().lerp(ctx.engineerHead, 0.5);
  return [
    [0, mid.clone().add(V(0, -0.45, 0)), 2.4, 0.0, 0.0],                          // fast push in from wide (opening rule)
    [0.35, mid.clone().add(V(-0.1, -0.4, 0)), 2.0, -0.08, -0.02],
    [T(70) - 0.1, ctx.keeperHead.clone().add(V(0.3, -0.45, 0)), 1.6, -0.28, -0.06],   // on the keeper as he speaks
    [T(74) - 0.1, ctx.lens.clone().add(V(-0.3, -0.2, 0.1)), 2.1, 0.0, 0.03],       // "lens": the lens + his pointing hand
    [T(77) - 0.1, ctx.keeperHead.clone().add(V(0.2, -0.4, 0)), 1.7, -0.32, -0.06],   // "30 years": closer on the keeper
    [T(80) - 0.1, mid.clone().add(V(0.1, -0.4, 0)), 1.9, 0.08, -0.02],             // "You can't...": two-shot from the engineer side
    [T(86) - 0.15, ctx.lens.clone().add(V(0, -0.35, 0.55)), 2.1, 0.0, 0.04],            // "but it works": the spinning lens, both faces
  ];
}
export function cameraAt(t, ctx) {
  const F = framings(ctx);
  const at = (s) => { let f = F[0]; for (const k of F) if (s >= k[0]) f = k; return f; };
  const w = 7.0, dt = 1 / 240;
  const g = F[0][1].clone(), gv = V(0, 0, 0); let dist = F[0][2], dv = 0, az = F[0][3], av = 0, hh = F[0][4], hv = 0;
  for (let s = 0; s < t; s += dt) {
    const f = at(s);
    gv.add(f[1].clone().sub(g).multiplyScalar(w * w).sub(gv.clone().multiplyScalar(2 * w)).multiplyScalar(dt)); g.add(gv.clone().multiplyScalar(dt));
    dv += (w * w * (f[2] - dist) - 2 * w * dv) * dt; dist += dv * dt;
    av += (w * w * (f[3] - az) - 2 * w * av) * dt; az += av * dt;
    hv += (w * w * (f[4] - hh) - 2 * w * hv) * dt; hh += hv * dt;
  }
  const drift = 0.05 * Math.sin(t * 0.7);
  const a = az + drift, el = 0.06 + hh;
  const pos = g.clone().add(V(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el)).multiplyScalar(dist));
  const r = Math.hypot(pos.x, pos.z); if (r > 2.55) { pos.x *= 2.55 / r; pos.z *= 2.55 / r; }
  return { pos, target: g };
}
