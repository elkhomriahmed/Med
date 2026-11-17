// One word at a time, white bold rounded sans with black outline + small shadow, bounces in, fixed ~70% down (STYLE_BIBLE v11 #8).
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

const fontFace = `@font-face { font-family: "CapFont"; src: url("${staticFile("fonts/Montserrat.ttf")}") format("truetype"); font-weight: 100 900; }`;

// words: [[start_s, end_s, text], ...] relative to the composition start
export const Captions = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const k = width / 1080;                                          // sizes are for 1080 wide
  const t = frame / fps;
  let cur = null;
  for (const w of words) if (t >= w[0] - 0.02) cur = w;          // hold the last word until the next one starts
  if (!cur) return <style>{fontFace}</style>;
  const age = (t - (cur[0] - 0.02)) * fps;                        // frames since this word appeared
  const s = interpolate(age, [0, 3, 6], [0.55, 1.12, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  return (
    <AbsoluteFill>
      <style>{fontFace}</style>
      <div style={{ position: "absolute", top: "70%", width: "100%", textAlign: "center", transform: `translateY(-50%) scale(${s})` }}>
        <span style={{ fontFamily: "CapFont", fontWeight: 900, fontSize: 72 * k, color: "#fff", letterSpacing: 1 * k,
          WebkitTextStroke: `${9 * k}px #000`, paintOrder: "stroke fill", textShadow: `0 ${5 * k}px ${8 * k}px rgba(0,0,0,0.45)` }}>
          {cur[2].toLowerCase()}
        </span>
      </div>
    </AbsoluteFill>
  );
};
