import React from "react";
import { Composition } from "remotion";
import { Cast, Poses, Seq, HairCheck, POSE_LIST } from "./CharTest.jsx";
export const Root = () => (
  <>
    <Composition id="Cast" component={Cast} durationInFrames={2} fps={30} width={1080} height={1920} />
    <Composition id="Poses" component={Poses} durationInFrames={POSE_LIST.length} fps={30} width={1080} height={1920} />
    <Composition id="HairCheck" component={HairCheck} durationInFrames={4} fps={30} width={1080} height={1920} />
    <Composition id="Seq" component={Seq} durationInFrames={120} fps={30} width={1080} height={1920} />
  </>
);
