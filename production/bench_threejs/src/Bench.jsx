import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { buildScene } from "./scene.js";

export const Bench = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvas = useRef(null);
  const ctx = useRef(null);
  const [handle] = useState(() => delayRender("build three.js scene"));

  useEffect(() => {
    let alive = true;
    buildScene(canvas.current, width, height).then((c) => {
      if (!alive) return;
      ctx.current = c;
      c.renderFrame(frame);
      continueRender(handle);
    });
    return () => { alive = false; ctx.current?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { ctx.current?.renderFrame(frame); }, [frame]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <canvas ref={canvas} width={width} height={height} style={{ width, height }} />
    </AbsoluteFill>
  );
};
