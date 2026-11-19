import React from "react";
import { Composition } from "remotion";
import { Cast, Poses, Seq, HairCheck, POSE_LIST } from "./CharTest.jsx";
import { Cast2, Poses2, POSE_LIST2, Seq2 } from "./CharTest2.jsx";
export const Root = () => (
  <>
    <Composition id="Cast" component={Cast} durationInFrames={2} fps={30} width={1080} height={1920} />
    <Composition id="Poses" component={Poses} durationInFrames={POSE_LIST.length} fps={30} width={1080} height={1920} />
    <Composition id="HairCheck" component={HairCheck} durationInFrames={4} fps={30} width={1080} height={1920} />
    <Composition id="Seq" component={Seq} durationInFrames={120} fps={30} width={1080} height={1920} />
    <Composition id="Cast2" component={Cast2} durationInFrames={3} fps={30} width={1080} height={1920} />
    <Composition id="Poses2" component={Poses2} durationInFrames={POSE_LIST2.length} fps={30} width={1080} height={1920} />
    <Composition id="Seq2" component={Seq2} durationInFrames={90} fps={30} width={1080} height={1920} />
  </>
);
