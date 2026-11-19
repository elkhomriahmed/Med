import React from "react";
import { Composition } from "remotion";
import { InteriorTest, SHOTS } from "./InteriorTest.jsx";

const C = (id, props, d = 60) => <Composition key={id} id={id} component={InteriorTest} durationInFrames={d} fps={30} width={1080} height={1920} defaultProps={props} />;
export const Root = () => (
  <>
    {C("Tour", { tour: true }, SHOTS.length)}
    {C("PerfBank", { shot: 0, wobble: true }, 20)}
    {C("PerfInter", { shot: 3, wobble: true }, 20)}
    {C("PerfCell", { shot: 4, wobble: true }, 20)}
    {C("Bank1Wide", { shot: 0 })}
    {C("Bank1Cctv", { shot: 1 })}
    {C("Bank2Wide", { shot: 2 })}
  </>
);
