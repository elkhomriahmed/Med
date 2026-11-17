// Exterior sky dome: extends world/sky.js (same gradient/stars/haze/moon/glitter maths) with soft fBm clouds, a moon with
// faint maria, and per-time uniforms switchable every frame (setPreset). One dome for the whole world (radius 1600).
import * as THREE from "three";
import { GLSL_NOISE } from "./util.js";

export function createExteriorSky(r = 1500) {
  const v3 = () => ({ value: new THREE.Vector3() });
  const uniforms = { zenith: v3(), horizon: v3(), haze: v3(), sea: v3(), seaH: v3(), sunCol: v3(), sunDir: v3(), cloudLit: v3(), cloudDark: v3(),
    hazeW: { value: 0.05 }, hazeK: { value: 0.8 }, stars: { value: 1 }, sunSize: { value: 0.02 }, sunGlow: { value: 0.1 }, moon: { value: 1 },
    clouds: { value: 0.3 }, time: { value: 0 }, horizonY: { value: -0.022 } };
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: true, depthTest: true, fog: false, uniforms,
    vertexShader: `varying vec3 vd; void main(){ vd = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p; }`,
    fragmentShader: `
      uniform vec3 zenith,horizon,haze,sea,seaH,sunCol,sunDir,cloudLit,cloudDark; uniform float hazeW,hazeK,stars,sunSize,sunGlow,moon,clouds,time,horizonY;
      varying vec3 vd;
      ${GLSL_NOISE}
      void main(){
        vec3 d = normalize(vd); float y = d.y - horizonY; float az = atan(d.z, d.x);
        vec3 sd = normalize(sunDir); float sdot = dot(d, sd); float ang = acos(clamp(sdot,-1.,1.));
        vec3 c;
        if (y > 0.0) {
          c = mix(horizon, zenith, pow(clamp(y*1.6,0.,1.), 0.55));
          if (stars > 0.0) {
            vec2 sp = vec2(az*95.0, asin(clamp(d.y,-1.,1.))*95.0);
            vec2 cell = floor(sp), f = fract(sp)-0.5; float h = exH(cell);
            vec2 o = vec2(exH(cell+3.1), exH(cell+7.7))-0.5; float big = step(0.93, exH(cell+11.3));
            float rad = mix(0.09, 0.19, big)*(0.6+0.8*h); float s = smoothstep(rad, rad*0.35, length(f-o*0.6));
            float on = step(0.55, h) * smoothstep(0.02, 0.12, y);
            c += vec3(0.95,0.95,1.0) * s * on * stars * (0.55+0.9*h);
          }
          // clouds: flat layer projected on a plane, drifting slowly; lit side toward the sun/moon
          if (clouds > 0.0) {
            vec2 cp = d.xz / max(d.y + 0.06, 0.02) * 1.3 + vec2(time*0.004, time*0.0015);
            float n = exF(cp*1.1); float cov = smoothstep(1.0 - clouds*0.75, 1.08 - clouds*0.55, n);
            float lit = clamp(0.5 + 0.6*dot(normalize(vec3(d.x,0.0,d.z)), normalize(vec3(sd.x,0.0,sd.z)+1e-4)) + 0.25*(n-0.5), 0.0, 1.0);
            vec3 cc = mix(cloudDark, cloudLit, lit*lit) * (1.0 + 2.0*sunGlow*exp(-ang*ang/0.08));
            c = mix(c, cc, cov * smoothstep(0.0, 0.08, y) * 0.92);
          }
        } else {
          float yy = -y;
          c = mix(seaH, sea, pow(clamp(yy*5.0,0.,1.), 0.6));
        }
        c = mix(c, haze, hazeK*exp(-pow(y/hazeW, 2.0)));
        // moon / sun disc (moon gets soft grey maria) + glow
        float disc = smoothstep(sunSize, sunSize*0.8, ang);
        vec3 tang = normalize(cross(sd, vec3(0.0,1.0,0.0)) + 1e-5); vec3 bit = cross(tang, sd);
        vec2 mp = vec2(dot(d, tang), dot(d, bit)) / sunSize;
        float maria = moon * (0.25*smoothstep(0.55, 0.35, length(mp - vec2(0.25,0.2))) + 0.18*smoothstep(0.4, 0.2, length(mp + vec2(0.3,0.1)))
                              + 0.12*smoothstep(0.3, 0.1, length(mp - vec2(-0.1,-0.45))));
        c += sunCol * disc * (1.0 - maria) * step(0.0, y + 0.004);
        c += sunCol * 0.05 * sunGlow * exp(-ang*ang/0.02) + haze*sunGlow*0.25*exp(-ang*ang/0.15);
        gl_FragColor = vec4(c, 1.0);
      }` });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.name = "sky";
  mesh.userData.setPreset = (P) => {
    for (const k of ["zenith", "horizon", "haze", "sea", "seaH", "sunCol", "cloudLit", "cloudDark"]) uniforms[k].value.set(...P[k]);
    uniforms.sunDir.value.set(...P.sunDir).normalize();
    for (const k of ["hazeW", "hazeK", "stars", "sunSize", "sunGlow", "moon", "clouds"]) uniforms[k].value = P[k];
  };
  mesh.userData.update = (t) => (uniforms.time.value = t);
  mesh.userData.uniforms = uniforms;
  return mesh;
}
