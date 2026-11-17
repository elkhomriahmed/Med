// Camera paths for every video (fixes the "laggy" spring camera of the first sample).
// A path is a list of keys { t, pos: Vector3, target: Vector3, fov?, stop? }.
// Between keys the camera follows a time-parameterised cubic Hermite spline with Catmull-Rom tangents, so it NEVER slows to
// zero at a key (one continuous move per shot, STYLE_BIBLE F2). Keys with stop: true have zero velocity (shot start/end, holds).
// Pure function of t: no history, no smoothing state, same result for any frame order (Remotion renders frames in parallel).
import * as THREE from "three";

const herm = (p0, p1, m0, m1, u, dt) => {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * dt * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * dt * m1;
};

// Monotone (Fritsch-Carlson style) tangents: never overshoot a key, so a far flight key can't bend the previous framing
// off into the sky or through a roof; still C1-continuous (no stop at keys unless the motion really reverses).
function tangents(keys, get) {
  return keys.map((k, i) => {
    if (k.stop || i === 0 || i === keys.length - 1) return 0;
    const a = keys[i - 1], b = keys[i + 1];
    const d0 = (get(k) - get(a)) / Math.max(1e-6, k.t - a.t), d1 = (get(b) - get(k)) / Math.max(1e-6, b.t - k.t);
    if (d0 * d1 <= 0) return 0;
    const w0 = 2 * (b.t - k.t) + (k.t - a.t), w1 = (b.t - k.t) + 2 * (k.t - a.t);   // weighted harmonic mean
    return (w0 + w1) / (w0 / d0 + w1 / d1);
  });
}

/** Build a sampler: at(t) -> { pos, target, fov }. keys must be sorted by t. */
export function cameraPath(keys) {
  const chan = [];
  const getters = [];
  for (const f of ["pos", "target"]) for (const c of ["x", "y", "z"]) getters.push((k) => k[f][c]);
  getters.push((k) => k.fov ?? 50);
  for (const g of getters) chan.push(tangents(keys, g));
  return function at(t) {
    let i = 0;
    while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    if (t <= keys[0].t) i = 0;
    const dt = Math.max(1e-6, b.t - a.t), u = THREE.MathUtils.clamp((t - a.t) / dt, 0, 1);
    const v = getters.map((g, c) => herm(g(a), g(b), chan[c][i], chan[c][Math.min(i + 1, keys.length - 1)], u, dt));
    return { pos: new THREE.Vector3(v[0], v[1], v[2]), target: new THREE.Vector3(v[3], v[4], v[5]), fov: v[6] };
  };
}

/** Fast flight between two places: eases in and out (smootherstep), arcing through optional waypoints, in `dur` seconds.
 *  Returns keys to splice into a path: the start and end keys get stop:false so the flight hands over without a halt. */
export function flightKeys(t0, dur, from, to, via = []) {
  const pts = [from, ...via, to], n = pts.length - 1, keys = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, e = s * s * s * (s * (s * 6 - 15) + 10);       // smootherstep timing: slow-fast-slow
    keys.push({ t: t0 + dur * e, pos: pts[i].pos.clone(), target: pts[i].target.clone(), fov: pts[i].fov ?? 50 });
  }
  return keys;
}

/** Sample the path and report the worst jerk / speed spikes and any lens collisions (for the check step). */
export function checkPath(at, t0, t1, fps = 30, near = (p) => Infinity) {
  let prev = null, prevV = null, worstJump = 0, minClear = Infinity, at_ = 0;
  for (let f = Math.ceil(t0 * fps); f <= t1 * fps; f++) {
    const p = at(f / fps).pos, d = near(p);
    if (d < minClear) { minClear = d; at_ = f; }
    if (prev) { const v = p.clone().sub(prev); if (prevV) worstJump = Math.max(worstJump, v.clone().sub(prevV).length()); prevV = v; }
    prev = p;
  }
  return { worstAccelPerFrame: worstJump, minClearance: minClear, minClearanceFrame: at_ };
}
