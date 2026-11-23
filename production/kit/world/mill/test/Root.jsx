import React from "react";
import { Composition } from "remotion";
import { MillTest } from "./MillTest.jsx";

const C = (id, props) => <Composition key={id} id={id} component={MillTest} durationInFrames={90} fps={30} width={540} height={960} defaultProps={props} />;
export const Root = () => (
  <>
    {C("GroundWide", { view: "groundWide" })}
    {C("SignClose", { view: "signClose" })}
    {C("TopWide", { view: "topWide" })}
    {C("TopCandle", { view: "topCandle" })}
    {C("Rafters", { view: "rafters", figures: false, set: { shake: 1, t: 1.3 } })}
    {C("Stairs", { view: "stairs" })}
    {C("ExteriorNight", { view: "exteriorNight", figures: false })}
    {C("ExteriorBlast", { view: "exteriorNight", figures: false, set: { blast: 0.5 } })}
    {C("RiverWide", { view: "riverWide", figures: false })}
    {C("WindowOutside", { view: "windowOutside", figures: false })}
    {C("GroundDay", { view: "groundWide", time: "day" })}
    {C("Bench", { view: "topWide", bench: true })}
  </>
);
