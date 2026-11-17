import React from "react";
import { registerRoot, Composition } from "remotion";
import { Sample } from "./Sample.jsx";
import { DURATION, FPS } from "./direction.js";

const Root = () => <Composition id="KeeperLaughs" component={Sample} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />;
registerRoot(Root);
