// Whole-video CODE audit (user, 2026-11-24): steps the direction through EVERY frame without rendering and measures what the
// viewer would see: lens clearance (rays into the real scene), heads in frame (size %, cropped), back view while talking, characters
// popping / jumping / vanishing on screen, people inside car bodies or each other, camera jerks outside designed cuts.
// Run: npx remotion still videos/v04/index.js V04Low out/audit.png --frame=0 --gl=angle --log=verbose --props='{"audit":true}'
import * as THREE from "three";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const worldVisible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };

export function runAudit({ dir, chars, car, cars, lot, optics, camera, live, FPS, END, applyFrame }) {
  const N = Math.round(END * FPS), cuts = Object.values(dir.S).map((s) => Math.round(s * FPS));
  const nearCut = (f, w = 2) => cuts.some((c) => Math.abs(f - c) <= w);
  const flags = []; const flag = (f, kind, msg) => flags.push([f, kind, msg]);
  const ray = new THREE.Raycaster(); const meshes = [];
  const dynamic = new Set(); car.userData.door?.traverse((o) => dynamic.add(o));
  for (const g of [lot.group, car, optics, ...cars]) { g.updateMatrixWorld(true); g.traverse((o) => { if (o.isMesh && !o.material?.transparent) {
    const b = new THREE.Box3().setFromObject(o); if (b.getSize(new THREE.Vector3()).length() < 60) meshes.push({ o, b, dyn: dynamic.has(o) }); } }); }
  const box = new THREE.Box3(), tmp = new THREE.Vector3(); const t0 = performance.now();
  let prev = null;
  for (let f = 0; f < N; f++) {
    const t = f / FPS; const { a, c } = applyFrame(t);
    // ---- lens clearance: 9 rays through the frustum against nearby opaque meshes
    if (f % 150 === 0) console.log(`AUDIT_PROGRESS f${f} ${((performance.now() - t0) / 1000).toFixed(1)} s`);
    const near = meshes.filter((m) => (m.dyn ? box.setFromObject(m.o) : box.copy(m.b)).distanceToPoint(camera.position) < 0.8 && worldVisible(m.o)).map((m) => m.o);
    let minD = 9, blocked = 0;
    if (near.length) for (const [sx, sy] of [[0, 0], [-0.7, -0.7], [0, -0.7], [0.7, -0.7], [-0.7, 0], [0.7, 0], [-0.7, 0.7], [0, 0.7], [0.7, 0.7]]) {
      ray.setFromCamera(new THREE.Vector2(sx, sy), camera); ray.far = 0.8; const h = ray.intersectObjects(near, false)[0];
      if (h) { minD = Math.min(minD, h.distance); if (h.distance < 0.35) blocked++; } }
    if (blocked >= 3) flag(f, "BLOCKED", `${blocked}/9 rays hit geometry < 0.35 m`);
    else if (minD < 0.25) flag(f, "LENS", `geometry ${minD.toFixed(2)} m from lens`);
    // ---- characters
    const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const cur = {};
    for (const n in chars) {
      const s = a.cast[n]; if (!s?.visible) continue;
      const hc = chars[n].headCenter(); const R = 0.29 * (chars[n].spec?.scale || 1);
      const inView = fr.intersectsSphere(new THREE.Sphere(hc, R * 1.6)) || fr.containsPoint(s.pos.clone().add(V(0, 0.5, 0)));
      const p = hc.clone().project(camera), q = hc.clone().add(tmp.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(R)).project(camera);
      const rw = Math.abs(q.x - p.x) / 2;                                    // head radius as a fraction of frame width
      cur[n] = { pos: s.pos.clone(), inView, hc: hc.clone(), talk: typeof s.s?.mouth === "string" && /^_[A-Z]/.test(s.s.mouth) && s.s.mouth !== "_blink" };
      const dCam = hc.distanceTo(camera.position);
      if (inView && p.z < 1) {
        if (dCam < 0.6) flag(f, "HEAD_NEAR_LENS", `${n} head ${dCam.toFixed(2)} m`);
        const sz = 2 * rw * 100;
        if (sz > 45) flag(f, "HEAD_BIG", `${n} head ${sz.toFixed(0)}% of width`);
        const top = p.y + rw * (camera.aspect), inside = Math.abs(p.x) < 1 && p.y < 1;
        if (inside && sz > 8 && top > 1.0 && p.y < 0.98) flag(f, "HEAD_CROPPED", `${n} head top out of frame`);
        // back view while talking
        const fwd = V(Math.sin(s.rot ?? 0), 0, Math.cos(s.rot ?? 0)), toCam = camera.position.clone().sub(hc).setY(0).normalize();
        const ang = Math.acos(Math.max(-1, Math.min(1, fwd.dot(toCam)))) * 180 / Math.PI;
        if (ang > 95 && cur[n].talk && s.s?.backView !== false && sz > 6) flag(f, "TALK_BACKVIEW", `${n} talks with his back to us (${ang.toFixed(0)}°)`);
      }
      // inside the car body (feet inside the footprint, not seated)
      const lp = car.worldToLocal(s.pos.clone());
      if (Math.abs(lp.x) < 0.88 && lp.z > -2.05 && lp.z < 2.1 && !(s.s?.sit > 0.3)) flag(f, "IN_CAR_BODY", `${n} stands inside the car footprint (${lp.x.toFixed(2)}, ${lp.z.toFixed(2)})`);
      const lh = car.worldToLocal(hc.clone());
      if (Math.abs(lh.x) < 0.95 && lh.y > 0.95 && lh.y < 1.5 && lh.z > -0.9 && lh.z < 1.15 && !(s.s?.sit > 0.3)) flag(f, "HEAD_IN_CABIN", `${n} head inside the cabin glass`);
    }
    const names = Object.keys(cur);
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const d = cur[names[i]].pos.clone().setY(0).distanceTo(cur[names[j]].pos.clone().setY(0)); if (d < 0.42) flag(f, "BODIES_OVERLAP", `${names[i]} / ${names[j]} ${d.toFixed(2)} m`); }
    if (prev) {
      // pops: someone appears / vanishes while in view (not on a cut), or jumps
      for (const n of new Set([...Object.keys(cur), ...Object.keys(prev.cur)])) {
        const A0 = prev.cur[n], A1 = cur[n];
        if (!nearCut(f) && ((A1 && !A0 && A1.inView) || (A0 && !A1 && A0.inView))) flag(f, "POP", `${n} ${A1 ? "appears" : "vanishes"} on screen`);
        if (A0 && A1 && !nearCut(f) && A0.pos.distanceTo(A1.pos) > 0.12) flag(f, "JUMP", `${n} moves ${A0.pos.distanceTo(A1.pos).toFixed(2)} m in one frame`);
      }
      // camera jerk: velocity change outside cuts
      const v = camera.position.clone().sub(prev.cam), dv = prev.v ? v.distanceTo(prev.v) : 0;
      const dirNow = c.target.clone().sub(c.pos).normalize(), turn = prev.dir ? Math.acos(Math.min(1, dirNow.dot(prev.dir))) * 180 / Math.PI : 0;
      if (!nearCut(f, 3) && (dv > 0.05 || turn > 6)) flag(f, "CAM_JERK", `dv ${dv.toFixed(3)} m/f, turn ${turn.toFixed(1)}°/f`);
      prev = { cam: camera.position.clone(), v, dir: dirNow, cur };
    } else prev = { cam: camera.position.clone(), v: null, dir: c.target.clone().sub(c.pos).normalize(), cur };
  }
  // group consecutive frames per kind
  const out = []; const key = (x) => x[1] + "|" + x[2].replace(/[\d.]+/g, "#");
  let run = null;
  for (const x of flags) { if (run && run.k === key(x) && x[0] - run.f1 <= 2) { run.f1 = x[0]; continue; } if (run) out.push(run); run = { k: key(x), kind: x[1], msg: x[2], f0: x[0], f1: x[0] }; }
  if (run) out.push(run);
  for (const r of out) console.log(`AUDIT ${r.kind} f${r.f0}-${r.f1} (${(r.f0 / FPS).toFixed(2)}-${(r.f1 / FPS).toFixed(2)} s) ${r.msg}`);
  console.log(`AUDIT_DONE frames=${N} flags=${flags.length} runs=${out.length}`);
}
