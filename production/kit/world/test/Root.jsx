import React from "react";
import { Composition } from "remotion";
import { WorldTest } from "./WorldTest.jsx";

const C = (id, props) => <Composition id={id} component={WorldTest} durationInFrames={300} fps={30} width={1080} height={1920} defaultProps={props} />;

export const Root = () => (
  <>
    {C("WorldTest", { cam: 0 })}
    {C("WorldTestLow", { cam: 1 })}
    {C("WorldTestHigh", { cam: 2 })}
    {C("WorldTestBack", { cam: 3 })}
    {C("NightWide", { cam: 8, time: "night", controls: { vapour: 0 } })}
    {C("DuskWide", { cam: 8, time: "dusk" })}
    {C("MorningWide", { cam: 8, time: "morning" })}
    {C("MorningRef", { cam: 0, time: "morning" })}
    {C("WinterOutside", { cam: 4, time: "winter", figures: false })}
    {C("PoolClose", { cam: 5, time: "night", figures: false, controls: { vapour: 1 } })}
    {C("PoolCloseAvoid", { cam: 0, time: "night", controls: { vapour: 1, vapourAvoid: [{ p: [-0.62, 1.33, 0.7], r: 0.32 }, { p: [0.62, 1.33, 0.78], r: 0.32 }] } })}
    {C("PourHalf", { cam: 5, time: "night", figures: false, setup: "pour", controls: { poolFill: 0.45, pour: 1 } })}
    {C("PoolEmpty", { cam: 5, time: "night", figures: false, controls: { poolFill: 0 } })}
    {C("GearsTooth", { cam: 6, time: "night", figures: false, controls: { toothPop: 0.45, crank: 0.7 } })}
    {C("GearsToothLanded", { cam: 6, time: "night", figures: false, controls: { toothPop: 1, crank: 0.7 } })}
    {C("PropsHatch", { cam: 9, time: "night", figures: false, setup: "props", controls: { oilSpill: 1 } })}
    {C("DbgNoSpot", { cam: 8, time: "night", lightsOff: ["lampSpot"] })}
    {C("DbgNoMoon", { cam: 8, time: "night", lightsOff: ["moon"] })}
    {C("ExtSkyOutdoor", { cam: 4, time: "night", exterior: false, figures: false, extSky: true, far: 4000 })}
    {C("ExtSkyOutdoorNoPin", { cam: 4, time: "night", exterior: false, figures: false, extSky: true, far: 4000, pinSky: false })}
    {C("ExtSkyIndoor", { cam: 0, time: "night", exterior: false, extSky: true, far: 4000 })}
    {C("BgOutdoor", { cam: 4, time: "night", exterior: false, figures: false, bg: "#203060", far: 4000 })}
    {C("AnimWide", { cam: 8, time: "night", anim: true, setup: "pour" })}
    {C("NoExterior", { cam: 8, time: "night", exterior: false })}
  </>
);
