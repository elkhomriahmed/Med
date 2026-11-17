import React from "react";
import { Composition } from "remotion";
import { CharTest, POSES } from "./CharTest.jsx";
export const Root = () => (
  <Composition id="CharTest" component={CharTest} durationInFrames={POSES.length} fps={30} width={1080} height={1920} />
);
