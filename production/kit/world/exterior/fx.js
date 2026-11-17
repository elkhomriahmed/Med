// Exterior FX: lighthouse beams seen from outside (soft volumetric cones, analytic ray-to-axis falloff, back faces only so
// the camera can sit inside without a flat slab), a halo at the lamp, falling snow that wraps around the camera without
// popping, and cartoon seagulls (perched with tiny binoculars, or flying).
import * as THREE from "three";
import { roundedBox, place, tint, mergedMesh, lathe } from "../geometry.js";
import { plain } from "../materials.js";
import { rng } from "../../shared/assets.js";

/** Same rotation as the lamp room lens (lampRoom.update: rot = 0.95 * t + 3.4) so inside and outside beams match. */
export const beamRotation = (t) => 0.95 * t + 3.4;
export const beamAxis = (rot, i, count = 2, tiltDown = -0.02) => { const th = rot + (i / count) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(th), tiltDown, -Math.sin(th)).normalize(); };

export function createOutsideBeams({ apex = new THREE.Vector3(0, 1.54, -0.3), count = 2, tanA = 0.085, r0 = 0.35, length = 260, fade = 75,
  color = [1.0, 0.74, 0.42], intensity = 0.55 } = {}) {
  const group = new THREE.Group(); group.name = "outsideBeams"; const beams = [];
  for (let i = 0; i < count; i++) {
    const Rend = (r0 + length * tanA) * 1.35;
    const geo = new THREE.CylinderGeometry(Rend, r0 * 1.5, length, 40, 1, true); geo.translate(0, length / 2, 0);   // apex at origin, along +Y
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
      uniforms: { apex: { value: apex.clone() }, axis: { value: new THREE.Vector3(1, 0, 0) }, col: { value: new THREE.Vector3(...color) },
        tanA: { value: tanA }, r0: { value: r0 }, len: { value: length }, fadeLen: { value: fade }, inten: { value: intensity }, vis: { value: 1 } },
      vertexShader: `varying vec3 wp; void main(){ vec4 w = modelMatrix*vec4(position,1.0); wp = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform vec3 apex, axis, col; uniform float tanA, r0, len, fadeLen, inten, vis; varying vec3 wp;
        void main(){
          vec3 ro = cameraPosition, rd = normalize(wp - ro); float tmax = length(wp - ro);
          vec3 w0 = ro - apex; float b = dot(rd, axis), d = dot(rd, w0), e = dot(axis, w0); float den = max(1.0 - b*b, 1e-4);
          float t = clamp((b*e - d)/den, 0.0, tmax);
          vec3 pr = ro + rd*t; float s = clamp(dot(pr - apex, axis), 0.0, len); float dist = length(pr - (apex + axis*s));
          float rad = r0 + s*tanA;
          float core = exp(-dist*dist/(rad*rad)*2.2);
          float chord = min(2.0*rad/sqrt(den), 6.0*rad + 4.0) / (2.0*rad + 2.0);           // longer path through the beam when seen end-on
          float fade = exp(-s/fadeLen) * smoothstep(0.3, 2.5, s);
          // camera inside / right next to the beam: fade out (never a flat bright slab over the lens)
          float sc = max(dot(ro - apex, axis), 0.0); float dc = length(ro - (apex + axis*sc)); float rc = r0 + sc*tanA;
          float guard = smoothstep(1.0, 2.6, dc/rc);
          float a = min(core * fade * chord * inten * vis * guard, 0.9);
          gl_FragColor = vec4(col*a, 1.0);
        }` });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 5; mesh.name = "beamCone";
    group.add(mesh); beams.push(mesh);
  }
  // halo around the lamp, seen from outside (fades in with distance, never covers the lens up close)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex(), color: new THREE.Color(1.0, 0.72, 0.4), blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: 0.9 }));
  halo.position.copy(apex); halo.scale.setScalar(4.2); halo.renderOrder = 6; group.add(halo);
  const up = new THREE.Vector3(0, 1, 0), cp = new THREE.Vector3();
  function update(rot, camera, on = 1) {
    camera?.getWorldPosition(cp);
    beams.forEach((m, i) => { const ax = beamAxis(rot, i, count); m.position.copy(apex); m.quaternion.setFromUnitVectors(up, ax);
      m.material.uniforms.axis.value.copy(ax); m.material.uniforms.vis.value = on; m.visible = on > 0.001; });
    const d = camera ? cp.distanceTo(apex) : 100; halo.material.opacity = 0.9 * on * THREE.MathUtils.smoothstep(d, 5, 14); halo.visible = halo.material.opacity > 0.002;
    const k = THREE.MathUtils.clamp(d / 40, 1, 3); halo.scale.setScalar(4.2 * k);
  }
  return { group, beams, halo, update };
}

let _rt = null;
function radialTex() {
  if (_rt) return _rt;
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.15, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.45, "rgba(255,255,255,0.12)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  _rt = new THREE.CanvasTexture(c); _rt.colorSpace = THREE.SRGBColorSpace; return _rt;
}

/** Falling snow: N flakes in a box that wraps around the camera (positions are pure functions of time, faded at the box
 *  edges and near the lens, minimum on-screen size -> no flicker, no pops). */
export function createSnowfall({ count = 4200, box = [36, 22, 36], size = 0.035, seed = 4 } = {}) {
  const r = rng(seed), pos = new Float32Array(count * 3), ph = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos[3 * i] = r() * box[0]; pos[3 * i + 1] = r() * box[1]; pos[3 * i + 2] = r() * box[2]; ph[i] = r() * 100; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false,
    uniforms: { t: { value: 0 }, cam: { value: new THREE.Vector3() }, box: { value: new THREE.Vector3(...box) }, size: { value: size }, H: { value: 1920 },
      col: { value: new THREE.Vector3(0.95, 0.97, 1.0) }, amount: { value: 1 } },
    vertexShader: `attribute float ph; uniform float t, size, H; uniform vec3 cam, box; varying float a;
      void main(){
        vec3 drift = vec3(sin(t*0.6 + ph)*0.35 + t*0.4, -t*(0.9 + 0.35*fract(ph*7.3)), cos(t*0.5 + ph*1.7)*0.3);
        vec3 p = mod(position + drift - cam + box*0.5, box) - box*0.5;     // wrap around the camera
        vec3 e = abs(p)/(box*0.5); float edge = 1.0 - smoothstep(0.75, 1.0, max(e.x, max(e.y, e.z)));
        vec3 w = cam + p; vec4 mv = viewMatrix*vec4(w, 1.0); gl_Position = projectionMatrix*mv;
        float px = size*H*projectionMatrix[1][1]*0.5/max(-mv.z, 0.01);
        gl_PointSize = max(px, 2.0);
        a = edge * smoothstep(0.7, 1.6, -mv.z) * clamp(px/2.0, 0.25, 1.0); }`,
    fragmentShader: `uniform vec3 col; uniform float amount; varying float a; void main(){ float d = length(gl_PointCoord - 0.5);
        float k = smoothstep(0.5, 0.15, d); gl_FragColor = vec4(col, k*a*0.9*amount); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 8; pts.name = "snowfall";
  pts.userData.update = (t, camera) => { mat.uniforms.t.value = t; if (camera) camera.getWorldPosition(mat.uniforms.cam.value); };
  pts.userData.setHeight = (h) => (mat.uniforms.H.value = h);
  pts.userData.uniforms = mat.uniforms;
  return pts;
}

// ---------------------------------------------------------------- seagulls (one vertex-coloured mesh each)
const C = { white: 0xf6f4ee, grey: 0x9aa2ae, dark: 0x22201e, yellow: 0xf2b630, orange: 0xe8843a, brass: 0xc89a3a, black: 0x141414 };
const part = (g, c, at = [0, 0, 0], rot = [0, 0, 0]) => { tint(g, new THREE.Color(C[c])); return place(g, at, rot); };
const ell = (rx, ry, rz) => { const g = new THREE.SphereGeometry(1, 18, 12); g.scale(rx, ry, rz); return g; };
const gullMat = () => plain(0xffffff, { roughness: 0.65, relief: 0.15, vertexColors: true });

/** Perched gull holding binoculars to its eyes. Origin = feet on the perch; faces +Z. */
export function perchedGull(seed = 1) {
  const r = rng(seed + 3), p = [];
  p.push(part(ell(0.13, 0.12, 0.21), "white", [0, 0.19, 0], [-0.25, 0, 0]));                // body, chest up
  p.push(part(ell(0.085, 0.085, 0.09), "white", [0, 0.34, 0.11]));                           // head
  p.push(part(new THREE.ConeGeometry(0.022, 0.1, 10), "yellow", [0, 0.295, 0.2], [Math.PI / 2 + 0.55, 0, 0]));   // beak, tipped down under the binoculars
  p.push(part(ell(0.035, 0.08, 0.19), "grey", [0.115, 0.2, -0.04], [-0.3, 0.08, 0]), part(ell(0.035, 0.08, 0.19), "grey", [-0.115, 0.2, -0.04], [-0.3, -0.08, 0]));
  p.push(part(roundedBox(0.12, 0.025, 0.14, 0.01), "dark", [0, 0.13, -0.24], [-0.5, 0, 0]));                     // tail
  for (const s of [-1, 1]) {
    p.push(part(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 6), "orange", [s * 0.045, 0.045, 0.0]));
    p.push(part(roundedBox(0.05, 0.012, 0.06, 0.004), "orange", [s * 0.045, 0.006, 0.02]));
    // wing "arm" from the shoulder up to the binoculars + dark tip (holds them)
    const a = new THREE.Vector3(s * 0.1, 0.23, 0.06), b = new THREE.Vector3(s * 0.062, 0.335, 0.24), d = b.clone().sub(a);
    const arm = new THREE.CapsuleGeometry(0.022, d.length(), 4, 8);
    arm.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())));
    p.push(part(arm, "grey", [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2]));
    p.push(part(ell(0.022, 0.022, 0.03), "dark", [b.x + s * 0.008, b.y, b.z]));
    // binocular barrel + brass eyepiece rims
    p.push(part(new THREE.CylinderGeometry(0.024, 0.021, 0.075, 14), "black", [s * 0.033, 0.36, 0.22], [Math.PI / 2, 0, 0]));
    p.push(part(new THREE.TorusGeometry(0.024, 0.005, 6, 14), "brass", [s * 0.033, 0.36, 0.258]));
    p.push(part(new THREE.CircleGeometry(0.02, 14), "dark", [s * 0.033, 0.36, 0.2585]));
  }
  p.push(part(roundedBox(0.03, 0.02, 0.03, 0.005), "black", [0, 0.36, 0.22]));                 // bridge
  const m = mergedMesh(p, gullMat(), { name: "gull" }); const g = new THREE.Group(); g.add(m); g.name = "perchedGull";
  m.rotation.z = (r() - 0.5) * 0.12;
  return g;
}

/** Flying gull: body + two flapping wings. update(t) flaps. */
export function flyingGull(seed = 1) {
  const g = new THREE.Group(); g.name = "flyingGull"; const mat = gullMat();
  const body = mergedMesh([part(ell(0.1, 0.09, 0.22), "white"), part(ell(0.07, 0.07, 0.08), "white", [0, 0.06, 0.18]),
    part(new THREE.ConeGeometry(0.018, 0.08, 8), "yellow", [0, 0.05, 0.28], [Math.PI / 2, 0, 0]), part(roundedBox(0.1, 0.02, 0.12, 0.008), "dark", [0, 0.0, -0.25])], mat, { name: "gullBody" });
  g.add(body);
  const wing = (s) => { const w = new THREE.Group(); w.position.set(s * 0.07, 0.03, 0.02);
    const m = mergedMesh([part(roundedBox(0.34, 0.016, 0.17, 0.006), "grey", [s * 0.17, 0, 0]), part(roundedBox(0.22, 0.014, 0.12, 0.006), "grey", [s * 0.44, 0, -0.03], [0, s * 0.25, 0]),
      part(roundedBox(0.09, 0.013, 0.09, 0.005), "dark", [s * 0.58, 0, -0.07], [0, s * 0.35, 0])], mat, { name: "gullWing" });
    w.add(m); g.add(w); return w; };
  const L = wing(1), R = wing(-1), ph = seed * 1.7;
  g.userData.update = (t) => { const f = Math.sin(t * 7.5 + ph) * 0.55 + 0.1; L.rotation.z = f; R.rotation.z = -f; };
  g.scale.setScalar(1.6);
  return g;
}
