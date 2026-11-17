import React from "react";
import { Composition } from "remotion";
import { Bench } from "./Bench.jsx";

// 1871 frames = the full 62.4 s video at 30 fps. Sample = frames 0-217 (7.3 s).
export const Root = () => (
  <Composition id="Bench" component={Bench} durationInFrames={1871} fps={30} width={1080} height={1920} />
);
