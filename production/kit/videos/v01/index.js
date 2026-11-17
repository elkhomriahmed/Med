import React from "react";
import { registerRoot, Composition } from "remotion";
import { Video } from "./Video.jsx";
import { DURATION, FPS } from "./direction.js";

// V01 = the whole video; V01Still renders single frames for checks (same component, frame chosen by Remotion).
const Root = () => (
  <>
    <Composition id="V01" component={Video} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
    <Composition id="V01Low" component={Video} durationInFrames={DURATION} fps={FPS} width={540} height={960} defaultProps={{ low: true }} />
  </>
);
registerRoot(Root);
