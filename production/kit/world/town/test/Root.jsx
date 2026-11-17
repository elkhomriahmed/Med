import React from "react";
import { Composition } from "remotion";
import { TownTest } from "./TownTest.jsx";

const C = (id, props) => <Composition key={id} id={id} component={TownTest} durationInFrames={90} fps={30} width={1080} height={1920} defaultProps={props} />;
export const Root = () => (
  <>
    {C("TownWinterWater", { time: "winter", view: "fromWater" })}
    {C("TownWinterCrowd", { time: "winter", view: "crowdWide" })}
    {C("TownNightWide", { time: "night", view: "nightWide" })}
    {C("TownSigns", { time: "day", view: "signs" })}
    {C("TownDuskTwo", { time: "dusk", view: "twoShot" })}
    {C("TownBench", { time: "night", view: "crowdWide", bench: true })}
    {C("TownBenchWide", { time: "winter", view: "nightWide", bench: true })}
  </>
);
