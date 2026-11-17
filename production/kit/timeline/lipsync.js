// Word-timed lip-sync: vowels of the word spread over its duration; mouth closes for the last ~28% of each vowel slot.
const VOW = { a: "_A", o: "_O", u: "_O", e: "_E", i: "_E", y: "_E" };
export function viseme(words, t, from, to) {
  for (let i = from; i <= to; i++) {
    const [a, b, txt] = words[i];
    if (t >= a && t < b) {
      const vs = [...txt.toLowerCase()].filter((c) => VOW[c]).map((c) => VOW[c]);
      const n = Math.max(1, vs.length), seg = (b - a) / n, k = Math.min(n - 1, Math.floor((t - a) / seg));
      return (t - a) - k * seg < seg * 0.72 ? vs[k] || "_E" : "";
    }
  }
  return "";
}
// step function over [[t, value], ...]
export const step = (keys, t, def) => { let v = def; for (const [k, x] of keys) if (t >= k) v = x; return v; };
// smooth keyed value over [[t, value, transition_s], ...] (deterministic, no state)
const ss = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
export function keyed(keys, t) {
  let v = keys[0][1];
  for (const [tk, vk, d] of keys) if (t >= tk - d) v = v + (vk - v) * ss((t - (tk - d)) / d);
  return v;
}
