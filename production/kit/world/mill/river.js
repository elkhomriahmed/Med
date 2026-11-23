// Mill river (video 3): copy of world/exterior/sea.js with calmer waves (waveK), a slow downstream flow (+x) and a
// caller-supplied geometry (river strip + mill race) instead of the sea disc. Foam map = proximity to banks/piers.
import * as THREE from "three";
import { GLSL_NOISE } from "../exterior/util.js";

export const RIVER_Y = -1.2;

/** Foam proximity map: 1 at the shore -> 0 at `width` m, over a square of half-size `half` centred on the origin.
 *  shapes: [{ type: "island", rAt(theta) }, { type: "circle", x, z, r }] */
export function bakeFoam(shapes, { half = 72, size = 512, width = 5 } = {}) {
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = ((i + 0.5) / size * 2 - 1) * half, z = ((j + 0.5) / size * 2 - 1) * half;
    let d = 1e9;
    for (const s of shapes) {
      if (s.type === "island") d = Math.min(d, Math.hypot(x, z) - s.rAt(Math.atan2(z, x)));
      else d = Math.min(d, Math.hypot(x - s.x, z - s.z) - s.r);
    }
    const v = Math.max(0, Math.min(1, 1 - Math.max(d, 0) / width)), k = 4 * (j * size + i);
    data[k] = v * 255; data[k + 1] = d < 0 ? 255 : 0; data[k + 2] = 0; data[k + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; t.userData = { half }; return t;
}

export function createRiver(foamTex, geo, { apex = new THREE.Vector3(0, -50, 0), waveK = 0.32, flow = 0.35 } = {}) {
  const v3 = (x = 0, y = 0, z = 0) => ({ value: new THREE.Vector3(x, y, z) });
  const uniforms = {
    time: { value: 0 }, waveK: { value: waveK }, flow: { value: flow }, foam: { value: foamTex }, foamHalf: { value: foamTex.userData.half },
    keyDir: v3(0, 1, 0), keyCol: v3(1, 1, 1), amb: v3(0.1, 0.1, 0.15), deep: v3(0.01, 0.02, 0.05), specK: { value: 1 },
    zenith: v3(), horizon: v3(), haze: v3(), seaH: v3(), hazeW: { value: 0.05 }, hazeK: { value: 0.8 }, horizonY: { value: -0.022 },
    clouds: { value: 0 }, cloudLit: v3(),
    beamOn: { value: 0 }, beamApex: { value: apex.clone() }, beamAxis0: v3(1, 0, 0), beamAxis1: v3(-1, 0, 0), beamCol: v3(1.0, 0.72, 0.38),
    beamTan: { value: 0.12 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, fog: false,
    vertexShader: `varying vec3 wp; void main(){ vec4 w = modelMatrix*vec4(position,1.0); wp = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `
      uniform float time, waveK, flow, foamHalf, specK, hazeW, hazeK, horizonY, beamOn, beamTan, clouds;
      uniform sampler2D foam; uniform vec3 keyDir, keyCol, amb, deep, zenith, horizon, haze, seaH, beamApex, beamAxis0, beamAxis1, beamCol, cloudLit;
      varying vec3 wp;
      ${GLSL_NOISE}
      // directional wave with slope; faded when its wavelength gets near the pixel footprint (anti-alias = no shimmer)
      vec2 wave(vec2 p, vec2 dir, float lambda, float amp, float fp, float sp){
        float k = 6.2831/lambda; float ph = dot(p, dir)*k + time*sqrt(9.8*k)*sp;
        float aa = smoothstep(3.0*fp, 8.0*fp, lambda);
        return dir * amp * k * cos(ph) * aa;
      }
      // reflected beam: closest approach between the reflected ray and the (mirrored) beam axis
      float beamRefl(vec3 o, vec3 r, vec3 axis){
        vec3 a = vec3(axis.x, -axis.y, axis.z); vec3 A = vec3(beamApex.x, 2.0*(-1.2) - beamApex.y, beamApex.z);
        vec3 w0 = o - A; float b = dot(r, a), d = dot(r, w0), e = dot(a, w0); float den = max(1.0 - b*b, 1e-4);
        float t = max((b*e - d)/den, 0.0); vec3 pr = o + r*t; float s = max(dot(pr - A, a), 0.0);
        float dist = length(pr - (A + a*s)); float rad = 0.3 + s*beamTan*0.45;
        return exp(-dist*dist/(rad*rad)*2.0) * exp(-s/120.0) * smoothstep(1.0, 6.0, s);
      }
      void main(){
        vec2 p0 = wp.xz; float fp = length(fwidth(p0)) + 1e-4;
        vec2 pf = p0 - vec2(time*flow, 0.0); vec2 p = pf + vec2(exN(pf*0.035 + 3.1), exN(pf*0.035 - 5.7))*14.0 + vec2(exN(pf*0.11), exN(pf*0.11 + 9.0))*3.0;   // domain warp: no regular stripes
        vec3 V = normalize(cameraPosition - wp); float dist = length(cameraPosition - wp);
        vec2 sl = vec2(0.0);
        sl += wave(p, normalize(vec2( 0.8, 0.6)), 23.0, 0.20, fp, 1.0);
        sl += wave(p, normalize(vec2( 0.3, 0.95)), 14.0, 0.12, fp, 1.0);
        sl += wave(p, normalize(vec2(-0.7, 0.7)), 8.5, 0.075, fp, 1.0);
        sl += wave(p, normalize(vec2( 0.95,-0.3)), 5.2, 0.055, fp, 1.0);
        sl += wave(p, normalize(vec2(-0.2,-0.98)), 3.1, 0.032, fp, 1.0);
        sl += wave(p, normalize(vec2( 0.6,-0.8)), 1.7, 0.018, fp, 1.0);
        sl += wave(p, normalize(vec2(-0.9, 0.4)), 0.9, 0.009, fp, 1.0);
        // ripples (noise gradient), faded with footprint
        float ra = smoothstep(0.35, 0.12, fp);
        vec2 q = p*0.9 + vec2(time*0.25, time*0.18);
        float e = 0.15; vec2 g = vec2(exN(q+vec2(e,0.0)) - exN(q-vec2(e,0.0)), exN(q+vec2(0.0,e)) - exN(q-vec2(0.0,e)))/(2.0*e);
        sl += g * 0.10 * ra;
        sl *= waveK; vec3 N = normalize(vec3(-sl.x, 1.0, -sl.y));
        float ndv = max(dot(N, V), 0.0);
        float fres = 0.02 + 0.98*pow(1.0 - ndv, 5.0);
        vec3 R = reflect(-V, N); R.y = abs(R.y);
        vec3 sky = mix(horizon, zenith, pow(clamp(R.y*1.6, 0.0, 1.0), 0.55));
        sky = mix(sky, cloudLit, clouds*0.35*smoothstep(0.05, 0.4, R.y));
        sky = mix(sky, haze, hazeK*exp(-pow(R.y/hazeW, 2.0)));
        vec3 L = normalize(keyDir); float up = smoothstep(-0.02, 0.06, L.y);
        vec3 body = deep * (0.35 + 0.65*max(dot(N, L), 0.0)*up) + deep*amb*2.0;
        vec3 c = mix(body, sky*0.85, fres);
        vec3 H = normalize(L + V); float nh = max(dot(N, H), 0.0);
        c += keyCol * up * specK * (pow(nh, 600.0)*6.0 + pow(nh, 90.0)*0.35) * (0.4 + 0.6*fres*4.0);
        // foam near rocks and piles
        vec2 fuv = p0/(2.0*foamHalf) + 0.5;
        if (all(greaterThan(fuv, vec2(0.0))) && all(lessThan(fuv, vec2(1.0)))) {
          float prox = texture2D(foam, fuv).r;
          float n1 = exN(p0*1.6 + vec2(time*0.35, -time*0.2)), n2 = exN(p0*4.5 - vec2(time*0.5, time*0.3));
          float surge = 0.5 + 0.5*sin(time*1.1 + prox*7.0 + n1*3.0);
          float f = smoothstep(0.62, 0.9, prox*0.85 + n1*0.35 + n2*0.15 + surge*0.12 - 0.15) + smoothstep(0.9, 0.98, prox)*0.8;
          f = clamp(f, 0.0, 1.0) * smoothstep(0.5, 0.15, fp);
          vec3 lit = keyCol*up*max(L.y, 0.15)*0.45 + amb*1.1 + 0.01;
          c = mix(c, vec3(0.88, 0.92, 0.96)*lit, f*0.62);
        }
        // lighthouse beams reflected on the water
        if (beamOn > 0.0) {
          float br = beamRefl(wp, R, normalize(beamAxis0)) + beamRefl(wp, R, normalize(beamAxis1));
          c += beamCol * br * beamOn * (0.1 + fres*1.6) * 0.5;
        }
        // haze toward the horizon (matches the sky dome)
        float vy = -V.y - horizonY;
        c = mix(c, haze, clamp(hazeK*exp(-pow(vy/hazeW, 2.0)), 0.0, 1.0));
        c = mix(c, seaH, smoothstep(500.0, 1450.0, dist)*0.6);
        gl_FragColor = vec4(c, 1.0);
      }` });
  mat.extensions = { derivatives: true };
  const mesh = new THREE.Mesh(geo, mat);  mesh.name = "river"; mesh.frustumCulled = false; mesh.receiveShadow = false;
  mesh.userData.uniforms = uniforms;
  return mesh;
}
