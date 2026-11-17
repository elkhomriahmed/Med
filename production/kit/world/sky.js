// World kit: procedural sky domes with the sea below the horizon (no texture, resolution-free, one draw call).
// Presets: "night" (deep blue, stars, moon, horizon haze, moonlit sea glitter), "day", "sunset".
import * as THREE from "three";

export const SKY_PRESETS = {
  night: { zenith: [0.008, 0.016, 0.085], horizon: [0.045, 0.07, 0.25], haze: [0.15, 0.17, 0.33], hazeW: 0.045, hazeK: 0.85,
    sea: [0.006, 0.016, 0.055], seaHorizon: [0.07, 0.09, 0.22], stars: 1.0, sunCol: [1.6, 1.7, 2.0], sunSize: 0.022, sunGlow: 0.12,
    glitter: [0.7, 0.75, 0.95], sunDir: [-0.55, 0.32, -0.77] },
  day: { zenith: [0.10, 0.30, 0.85], horizon: [0.55, 0.72, 0.95], haze: [0.85, 0.88, 0.92], hazeW: 0.06, hazeK: 0.6,
    sea: [0.02, 0.10, 0.22], seaHorizon: [0.30, 0.45, 0.60], stars: 0, sunCol: [30, 28, 24], sunSize: 0.012, sunGlow: 0.5,
    glitter: [1.5, 1.4, 1.2], sunDir: [0.3, 0.6, -0.7] },
  sunset: { zenith: [0.06, 0.08, 0.30], horizon: [0.95, 0.42, 0.20], haze: [1.2, 0.62, 0.30], hazeW: 0.07, hazeK: 1.0,
    sea: [0.03, 0.04, 0.10], seaHorizon: [0.55, 0.28, 0.18], stars: 0.15, sunCol: [20, 9, 3], sunSize: 0.03, sunGlow: 0.9,
    glitter: [2.0, 0.9, 0.4], sunDir: [-0.4, 0.06, -0.9] },
  // lamp-room times of day (sunDir matches the room's key light for that time)
  dusk: { zenith: [0.035, 0.05, 0.20], horizon: [0.62, 0.30, 0.30], haze: [0.85, 0.45, 0.32], hazeW: 0.07, hazeK: 0.9,
    sea: [0.02, 0.03, 0.08], seaHorizon: [0.35, 0.20, 0.20], stars: 0.35, sunCol: [9, 4, 1.6], sunSize: 0.028, sunGlow: 0.7,
    glitter: [1.4, 0.65, 0.35], sunDir: [-0.62, 0.05, -0.78] },
  morning: { zenith: [0.16, 0.34, 0.78], horizon: [0.85, 0.72, 0.62], haze: [1.05, 0.86, 0.66], hazeW: 0.07, hazeK: 0.75,
    sea: [0.03, 0.12, 0.24], seaHorizon: [0.42, 0.50, 0.58], stars: 0, sunCol: [26, 19, 11], sunSize: 0.02, sunGlow: 0.8,
    glitter: [2.2, 1.7, 1.1], sunDir: [0.53, 0.40, 0.75] },
  winter: { zenith: [0.012, 0.02, 0.08], horizon: [0.07, 0.09, 0.22], haze: [0.22, 0.24, 0.36], hazeW: 0.06, hazeK: 0.9,
    sea: [0.008, 0.018, 0.05], seaHorizon: [0.08, 0.10, 0.20], stars: 0.6, sunCol: [1.6, 1.7, 2.0], sunSize: 0.022, sunGlow: 0.18,
    glitter: [0.6, 0.65, 0.85], sunDir: [-0.55, 0.32, -0.77] },
};

/** Sky + sea dome. Returns a Mesh (radius r, follows nothing: keep the camera inside). opts override preset fields. */
export function createSky(preset = "night", opts = {}, r = 400) {
  const P = { ...SKY_PRESETS[preset], ...opts }, v3 = (a) => new THREE.Vector3(...a);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { zenith: { value: v3(P.zenith) }, horizon: { value: v3(P.horizon) }, haze: { value: v3(P.haze) }, hazeW: { value: P.hazeW },
      hazeK: { value: P.hazeK }, sea: { value: v3(P.sea) }, seaH: { value: v3(P.seaHorizon) }, stars: { value: P.stars },
      sunCol: { value: v3(P.sunCol) }, sunSize: { value: P.sunSize }, sunGlow: { value: P.sunGlow }, glit: { value: v3(P.glitter) },
      sunDir: { value: v3(P.sunDir).normalize() }, horizonY: { value: P.horizonY ?? -0.02 }, time: { value: 0 }, exposure: { value: P.exposure ?? 1 } },
    vertexShader: `varying vec3 vd; void main(){ vd = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 zenith,horizon,haze,sea,seaH,sunCol,glit,sunDir; uniform float hazeW,hazeK,stars,sunSize,sunGlow,horizonY,time,exposure;
      varying vec3 vd;
      float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
      float n21(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec3 d = normalize(vd); float y = d.y - horizonY;
        float az = atan(d.z, d.x);
        vec3 c;
        if (y > 0.0) {
          c = mix(horizon, zenith, pow(clamp(y*1.6,0.,1.), 0.55));
          // stars: jittered cells in (azimuth, elevation), a few big ones, twinkle, fade into the haze
          if (stars > 0.0) {
            vec2 sp = vec2(az*95.0, asin(clamp(d.y,-1.,1.))*95.0);
            vec2 cell = floor(sp), f = fract(sp)-0.5; float h = h21(cell);
            vec2 o = vec2(h21(cell+3.1), h21(cell+7.7))-0.5; float big = step(0.93, h21(cell+11.3));
            float rad = mix(0.07, 0.17, big)*(0.6+0.8*h); float s = smoothstep(rad, rad*0.35, length(f-o*0.6));
            float on = step(0.55, h) * smoothstep(0.02, 0.12, y);
            c += vec3(0.95,0.95,1.0) * s * on * stars * (0.5+0.9*h) * (0.8+0.2*sin(time*2.0+h*40.0));
          }
        } else {
          float yy = -y;
          c = mix(seaH, sea, pow(clamp(yy*5.0,0.,1.), 0.6));
          // waves + moon/sun glitter column
          float w = n21(vec2(az*160.0, log(yy+0.002)*40.0 + time*0.6)) * n21(vec2(az*420.0, log(yy+0.002)*90.0 - time*0.9));
          vec3 sd = normalize(sunDir); float da = abs(atan(sin(az - atan(sd.z, sd.x)), cos(az - atan(sd.z, sd.x))));
          float column = exp(-da*da/(0.004+yy*0.06)) * smoothstep(0.0, 0.01, yy);
          c += glit * pow(w, 3.0) * (column*3.0 + 0.10);
        }
        // horizon haze band (both sides)
        c = mix(c, haze, hazeK*exp(-pow(y/hazeW, 2.0)));
        // moon / sun disc + glow
        float sdot = dot(d, normalize(sunDir)); float ang = acos(clamp(sdot,-1.,1.));
        c += sunCol * smoothstep(sunSize, sunSize*0.8, ang);
        c += sunCol * 0.05 * sunGlow * exp(-ang*ang/0.02) + haze*sunGlow*0.25*exp(-ang*ang/0.15);
        gl_FragColor = vec4(c*exposure, 1.0);
      }` });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), mat); m.frustumCulled = false; m.renderOrder = -10; m.name = "sky";
  m.userData.update = (t) => (mat.uniforms.time.value = t);
  m.userData.sunDir = v3(P.sunDir).normalize();
  /** Switch preset in place (uniforms only: no rebuild, no recompile). */
  m.userData.setPreset = (name, over = {}) => {
    const Q = { ...SKY_PRESETS[name], ...over }, U = mat.uniforms;
    for (const [k, u] of [["zenith", "zenith"], ["horizon", "horizon"], ["haze", "haze"], ["sea", "sea"], ["seaHorizon", "seaH"], ["sunCol", "sunCol"], ["glitter", "glit"]]) U[u].value.set(...Q[k]);
    for (const k of ["hazeW", "hazeK", "stars", "sunSize", "sunGlow"]) U[k].value = Q[k];
    U.sunDir.value.set(...Q.sunDir).normalize(); m.userData.sunDir.copy(U.sunDir.value);
  };
  return m;
}
