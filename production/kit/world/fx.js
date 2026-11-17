// World kit: atmosphere effects. Dust motes in the key light, rotating lighthouse beams (real spotlights + soft air shafts).
import * as THREE from "three";
import { rng } from "../shared/assets.js";
import { Reflector } from "three/addons/objects/Reflector.js";

/** Dust motes: tiny warm glints drifting in a volume. box = { min: Vector3, max: Vector3 } or a function filter(p) to
 *  keep motes only behind characters (rule W5). Returns Points with userData.update(t). */
export function createDust({ count = 160, min = [-2, 0.8, -2.5], max = [2, 2.7, 0], filter = null, color = [1.0, 0.82, 0.55],
  size = 0.016, intensity = 2.2, seed = 8 } = {}) {
  const r = rng(seed), pos = [], ph = [];
  while (pos.length / 3 < count) {
    const p = new THREE.Vector3(min[0] + r() * (max[0] - min[0]), min[1] + r() * (max[1] - min[1]), min[2] + r() * (max[2] - min[2]));
    if (filter && !filter(p)) continue; pos.push(p.x, p.y, p.z); ph.push(r() * 100);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("ph", new THREE.Float32BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, col: { value: new THREE.Vector3(...color).multiplyScalar(intensity) }, size: { value: size }, H: { value: 1920 } },
    vertexShader: `attribute float ph; uniform float t, size, H; varying float a;
      void main(){ vec3 p = position + vec3(sin(t*0.21+ph)*0.08, mod(t*0.02+ph*0.01, 0.3)-0.15, cos(t*0.17+ph*1.3)*0.08);
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv;
        gl_PointSize = max(1.5, size*H*projectionMatrix[1][1]*0.5/(-mv.z));
        a = 0.45+0.55*sin(t*1.3+ph*7.0); }`,
    fragmentShader: `uniform vec3 col; varying float a; void main(){ float d = length(gl_PointCoord-0.5); float k = smoothstep(0.5,0.0,d);
      gl_FragColor = vec4(col*k*k*a, 1.0); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.name = "dust";
  pts.userData.update = (t) => (mat.uniforms.t.value = t);
  pts.userData.setHeight = (h) => (mat.uniforms.H.value = h);
  return pts;
}

/** Lighthouse beams: N spotlights from apex, rotating about Y, each with a visible additive air shaft that fades with
 *  distance and never flashes straight into the camera (rule L3). update(angle, camera). */
export function createBeams({ apex = new THREE.Vector3(0, 1.54, -0.3), count = 2, angle = 0.2, length = 14, color = 0xffc27a,
  intensity = 60, castShadow = false, shaft = 1.0, tiltDown = -0.02 } = {}) {
  const group = new THREE.Group(); group.name = "beams"; const beams = [];
  const shaftMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { col: { value: new THREE.Color(1.0, 0.76, 0.42) }, vis: { value: 1 }, camp: { value: new THREE.Vector3() }, axis: { value: new THREE.Vector3() },
      apex: { value: apex.clone() }, k: { value: shaft } },
    vertexShader: `varying vec3 wp; varying vec3 wn; void main(){ vec4 w = modelMatrix*vec4(position,1.0); wp = w.xyz; wn = normalize(mat3(modelMatrix)*normal);
      gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 col,camp,axis,apex; uniform float vis,k; varying vec3 wp; varying vec3 wn;
      void main(){ float along = dot(wp-apex,axis); vec3 v = normalize(camp-wp);
        float thick = pow(abs(dot(wn, v)), 1.6);
        float a = thick * smoothstep(0.5,2.0,along) * exp(-along*0.13);
        a *= 1.0-smoothstep(0.75,0.97,abs(dot(v,axis)));
        gl_FragColor = vec4(col*a*0.9*vis*k, 1.0); }` });
  for (let i = 0; i < count; i++) {
    const sp = new THREE.SpotLight(color, intensity, 0, angle, 0.5, 1.4); sp.castShadow = castShadow;
    if (castShadow) { sp.shadow.mapSize.set(512, 512); sp.shadow.bias = -0.0008; sp.shadow.camera.near = 0.5; sp.shadow.camera.far = 20; }
    sp.position.copy(apex); group.add(sp, sp.target);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(length * Math.tan(angle), length, 40, 1, true), shaftMat.clone());
    cone.frustumCulled = false; group.add(cone);
    beams.push({ sp, cone, a0: (i / count) * Math.PI * 2 });
  }
  const tmp = new THREE.Vector3();
  function update(rot, camera) {
    for (const b of beams) {
      const th = rot + b.a0, axis = new THREE.Vector3(Math.cos(th), tiltDown, -Math.sin(th)).normalize(); b.axis = axis;
      b.sp.target.position.copy(apex).addScaledVector(axis, 10); b.sp.target.updateMatrixWorld();
      b.cone.position.copy(apex).addScaledVector(axis, length / 2); b.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), axis);
      const u = b.cone.material.uniforms; u.axis.value.copy(axis); u.apex.value.copy(apex);
      if (camera) {
        camera.getWorldPosition(u.camp.value);
        const rc = tmp.copy(u.camp.value).sub(apex), al = Math.max(rc.dot(axis), 0.01), off = rc.clone().addScaledVector(axis, -al).length();
        const kk = off / (al * Math.tan(angle)); u.vis.value = rc.dot(axis) < 0 ? 1 : Math.min(1, Math.max(0, (kk - 1.3) / 1.2));
      }
    }
  }
  /** 0..1: how much a world point sits inside a beam right now (for characters' "lit" face tint). */
  function litAt(p) { const v = p.clone().sub(apex).normalize(); let m = 0;
    for (const b of beams) if (b.axis) { const c = v.dot(b.axis); m = Math.max(m, THREE.MathUtils.clamp((c - Math.cos(angle * 1.9)) / (Math.cos(angle * 0.6) - Math.cos(angle * 1.9)), 0, 1)); }
    return m * m * (3 - 2 * m); }
  return { group, beams, update, litAt };
}

// ------------------------------------------------------------------------------------------------ story FX (video 1)
const NOISE_GLSL = `float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
  float n21(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }`;

/** Liquid-metal pool (mercury): a planar mirror ring that really reflects the scene (lamp, lens, characters) with a soft
 *  wobble, spreading from a pour point as it fills. center = world centre of the basin; the ring spans rIn..rOut.
 *  Returns { mesh, set({ fill 0..1, wobble 0..1, from: Vector3|null, time }), level() }.
 *  fill 0 = empty (hidden), 1 = full; the surface rises from yEmpty to yFull and spreads out from `from`. */
export function createPool({ center = new THREE.Vector3(0, 0, -0.3), rIn = 0.5, rOut = 0.84, yEmpty = 0.772, yFull = 0.818, res = 768 } = {}) {
  const shader = {
    uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, time: { value: 0 }, fill: { value: 1 },
      from: { value: new THREE.Vector2(0, 0.7) }, maxR: { value: 2 * rOut + 0.1 }, wob: { value: 0.3 }, rIn: { value: rIn }, rOut: { value: rOut } },
    vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 lp;
      void main(){ lp = position.xy; vUv = textureMatrix*vec4(position,1.0); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; uniform float time, fill, maxR, wob, rIn, rOut; uniform vec2 from;
      varying vec4 vUv; varying vec2 lp; ${NOISE_GLSL}
      void main(){
        float d = length(lp - from);
        float edge = fill*maxR + (n21(lp*14.0 + 3.0) - 0.5)*0.06*min(fill*8.0, 1.0);
        if (fill < 0.999 && d > edge) discard;
        float fresh = fill < 0.999 ? smoothstep(edge - 0.05, edge, d) : 0.0;
        float r = length(lp);
        float rip = sin(d*58.0 - time*5.0)*exp(-d*2.2)*0.55 + (n21(lp*22.0 + vec2(time*0.7, -time*0.5)) - 0.5)*0.8;
        vec4 uv = vUv; uv.xy += vec2(rip, rip*0.8)*0.010*wob*uv.w;
        vec3 refl = texture2DProj(tDiffuse, uv).rgb;
        float men = smoothstep(rOut, rOut - 0.035, r)*smoothstep(rIn, rIn + 0.02, r);
        vec3 c = refl*color*mix(0.55, 1.0, men)*(1.0 - 0.45*fresh) + vec3(0.012, 0.013, 0.015);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }` };
  const geo = new THREE.RingGeometry(rIn, rOut, 96, 1);
  const mesh = new Reflector(geo, { textureWidth: res, textureHeight: res, color: new THREE.Color(0.80, 0.83, 0.86), shader, clipBias: 0.002 });
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(center.x, yFull, center.z); mesh.name = "mercuryPool"; mesh.renderOrder = 1;
  const U = mesh.material.uniforms, tmp = new THREE.Vector3();
  let fill = 1;
  function set({ fill: f, wobble, from, time } = {}) {
    if (f !== undefined) { fill = THREE.MathUtils.clamp(f, 0, 1); U.fill.value = fill; mesh.visible = fill > 0.002;
      mesh.position.y = yEmpty + (yFull - yEmpty) * Math.sqrt(fill); }
    if (wobble !== undefined) U.wob.value = wobble;
    if (time !== undefined) U.time.value = time;
    if (from) { tmp.copy(from); U.from.value.set(tmp.x - center.x, -(tmp.z - center.z)); }   // ring lives in local XY (rotated -90 deg about X)
    else if (from === null) U.from.value.set(0, -(rOut - 0.05));
  }
  return { mesh, set, level: () => mesh.position.y, get fill() { return fill; } };
}

/** Pouring stream of liquid metal from a spout straight down onto a surface, with a small splash ring.
 *  set(flow 0..1, spoutWorld: Vector3, surfaceY, time). flow 0 hides it; thickness follows flow (no pop). */
export function createPour({ color = 0xd2d6dc } = {}) {
  const group = new THREE.Group(); group.name = "pour";
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.1, envMapIntensity: 1.6 });
  const g = new THREE.CylinderGeometry(1, 0.8, 1, 18, 12, false); g.translate(0, -0.5, 0);
  { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 + 0.12 * Math.sin(y * 40.0 + p.getX(i) * 3); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals(); }
  const stream = new THREE.Mesh(g, mat); stream.castShadow = false; group.add(stream);
  const splash = new THREE.Mesh(new THREE.TorusGeometry(1, 0.35, 8, 28), mat); splash.rotation.x = Math.PI / 2; group.add(splash);
  group.visible = false;
  function set(flow, spout, surfaceY, time = 0) {
    const f = THREE.MathUtils.clamp(flow, 0, 1); group.visible = f > 0.002 && !!spout; if (!group.visible) return;
    const r = 0.013 * THREE.MathUtils.smoothstep(f, 0, 0.35), len = Math.max(0.01, spout.y - surfaceY);
    stream.position.copy(spout); stream.scale.set(r, len, r); stream.rotation.y = time * 3;
    splash.position.set(spout.x, surfaceY + 0.004, spout.z); const s = r * (1.6 + 0.4 * Math.sin(time * 17)); splash.scale.set(s, s, s * 0.6);
  }
  return { group, set };
}

/** Faint green vapour wisps rising off a ring (mercury vapour). Soft, slow, never pops: each wisp fades in, rises,
 *  widens and fades out on a loop. set({ k 0..1, target: Vector3|null (drift toward it, e.g. a sleeping keeper's nose),
 *  pull 0..1, avoid: [{ p: Vector3, r }] (up to 4 heads: wisps fade wherever they would cover them), time }). */
export function createVapour({ center = new THREE.Vector3(0, 0.82, -0.3), rIn = 0.6, rOut = 0.82, count = 20, rise = 0.95, width = 0.2,
  height = 0.42, color = [0.22, 1.0, 0.3], seed = 21 } = {}) {
  const r = rng(seed), base = [], ph = [];
  for (let i = 0; i < count; i++) { const a = (i / count) * Math.PI * 2 + r() * 0.3, rr = rIn + r() * (rOut - rIn);
    base.push(center.x + rr * Math.cos(a), center.y, center.z + rr * Math.sin(a)); ph.push(r(), 0.10 + r() * 0.07); }
  const plane = new THREE.PlaneGeometry(1, 1); plane.translate(0, 0.5, 0);
  const g = new THREE.InstancedBufferGeometry(); g.index = plane.index; g.setAttribute("position", plane.attributes.position); g.setAttribute("uv", plane.attributes.uv);
  g.setAttribute("base", new THREE.InstancedBufferAttribute(new Float32Array(base), 3)); g.setAttribute("ph", new THREE.InstancedBufferAttribute(new Float32Array(ph), 2));
  g.instanceCount = count;
  const avoid = Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 0));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { t: { value: 0 }, k: { value: 0 }, rise: { value: rise }, w: { value: width }, hh: { value: height }, target: { value: new THREE.Vector3() },
      pull: { value: 0 }, col: { value: new THREE.Vector3(...color) }, avoid: { value: avoid } },
    vertexShader: `attribute vec3 base; attribute vec2 ph; uniform float t, rise, w, hh, pull; uniform vec3 target;
      varying vec2 vuv; varying float va; varying vec3 wpos; varying float sd;
      void main(){
        float u = fract(t*ph.y + ph.x);
        vec3 c = (modelMatrix*vec4(base,1.0)).xyz + vec3(sin(t*0.7+ph.x*6.0)*0.04, u*rise, cos(t*0.6+ph.x*4.0)*0.04);
        c = mix(c, target, pull*u*u);
        vec3 right = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
        vec3 p = c + right*position.x*w*(0.6+0.9*u) + vec3(0.0, 1.0, 0.0)*position.y*hh*(0.7+0.6*u);
        wpos = p; vuv = uv; sd = ph.x*17.0; va = smoothstep(0.0, 0.15, u)*(1.0 - smoothstep(0.65, 1.0, u));
        gl_Position = projectionMatrix*viewMatrix*vec4(p,1.0); }`,
    fragmentShader: `uniform float t, k; uniform vec3 col; uniform vec4 avoid[4]; varying vec2 vuv; varying float va; varying vec3 wpos; varying float sd;
      ${NOISE_GLSL}
      void main(){
        float x = vuv.x - 0.5 + sin(vuv.y*5.0 + t*1.1 + sd)*0.16*vuv.y;
        float body = exp(-x*x/(0.01 + 0.035*vuv.y)) * smoothstep(0.0, 0.2, vuv.y) * smoothstep(1.0, 0.55, vuv.y);
        float nn = n21(vec2(vuv.x*5.0 + sd, vuv.y*3.5 - t*0.7));
        float a = body*(0.35 + 0.85*nn)*va*k;
        for (int i = 0; i < 4; i++) { if (avoid[i].w > 0.0) {
          vec3 dir = avoid[i].xyz - cameraPosition; float L = length(dir); dir /= L; vec3 q = wpos - cameraPosition; float s = dot(q, dir);
          if (s > 0.0 && s < L + avoid[i].w) { float dd = length(q - dir*s)/s, ang = avoid[i].w/L; a *= smoothstep(ang*1.05, ang*1.9, dd); }
          a *= smoothstep(avoid[i].w*0.5, avoid[i].w*1.4, length(wpos - avoid[i].xyz)); } }
        if (a < 0.002) discard;
        gl_FragColor = vec4(col*0.85, min(a*4.0, 0.8)); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.name = "vapour"; mesh.renderOrder = 5; mesh.visible = false;
  function set({ k, target, pull, avoid: av, time } = {}) {
    if (k !== undefined) { mat.uniforms.k.value = THREE.MathUtils.clamp(k, 0, 1); mesh.visible = k > 0.002; }
    if (target !== undefined) { if (target) mat.uniforms.target.value.copy(target); mat.uniforms.pull.value = target ? (pull ?? 0.85) : 0; }
    else if (pull !== undefined) mat.uniforms.pull.value = pull;
    if (av !== undefined) avoid.forEach((v, i) => { const a = av?.[i]; if (a) v.set(a.p.x, a.p.y, a.p.z, a.r ?? 0.32); else v.set(0, 0, 0, 0); });
    if (time !== undefined) mat.uniforms.t.value = time;
  }
  return { mesh, set };
}

/** Falling snow around a place (outside a radius), seamless loop: flakes fade at the top/bottom of the volume. */
export function createSnowfall({ count = 1400, rMin = 3.0, rMax = 9, y0 = -1.5, y1 = 6, speed = 0.45, size = 0.022, seed = 31 } = {}) {
  const r = rng(seed), pos = [], ph = [];
  for (let i = 0; i < count; i++) { const a = r() * Math.PI * 2, rr = Math.sqrt(rMin * rMin + r() * (rMax * rMax - rMin * rMin));
    pos.push(rr * Math.cos(a), y0, rr * Math.sin(a)); ph.push(r() * 100); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("ph", new THREE.Float32BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { t: { value: 0 }, H: { value: 1920 }, size: { value: size }, span: { value: y1 - y0 }, speed: { value: speed } },
    vertexShader: `attribute float ph; uniform float t, H, size, span, speed; varying float a;
      void main(){ float u = fract(ph*0.137 + t*speed/span); vec3 p = position;
        p.y += span*(1.0 - u); p.x += sin(t*0.8 + ph)*0.12; p.z += cos(t*0.6 + ph*1.7)*0.12;
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv;
        gl_PointSize = max(1.0, size*H*projectionMatrix[1][1]*0.5/(-mv.z));
        a = smoothstep(0.0, 0.08, u)*smoothstep(1.0, 0.92, u); }`,
    fragmentShader: `varying float a; void main(){ float d = length(gl_PointCoord - 0.5); float k = smoothstep(0.5, 0.15, d);
      if (k*a < 0.01) discard; gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), k*a*0.85); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.name = "snowfall"; pts.renderOrder = 4;
  pts.userData.update = (t) => (mat.uniforms.t.value = t); pts.userData.setHeight = (h) => (mat.uniforms.H.value = h);
  return pts;
}
