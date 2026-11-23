import React from "react";
import { registerRoot, Composition } from "remotion";
import { Video } from "./Video.jsx";
import { DURATION, FPS } from "./direction.js";
const Root = () => (
  <>
    <Composition id="V04" component={Video} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
    <Composition id="V04Low" component={Video} durationInFrames={DURATION} fps={FPS} width={540} height={960} />
  </>
);
registerRoot(Root);
