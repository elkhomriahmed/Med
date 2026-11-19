import React from "react";
import { Composition } from "remotion";
import { PropsTest } from "./PropsTest.jsx";

const C = (id, props, w = 1440, h = 1440) => <Composition id={id} component={PropsTest} durationInFrames={120} fps={30} width={w} height={h} defaultProps={props} />;
export const Root = () => (
  <>
    {C("Lineup", { scene: "lineup" })}
    {C("States", { scene: "states" })}
    {C("Lemons", { scene: "lemons" })}
    {C("Camera", { scene: "camera" })}
    {C("Books", { scene: "books" })}
    {C("Screens", { scene: "screens" })}
    {C("OverlayCCTV", { scene: "lineup", overlay: "cctv", vertical: true }, 1080, 1920)}
    {C("OverlayRewind", { scene: "lineup", overlay: "rewind", vertical: true }, 1080, 1920)}
  </>
);
