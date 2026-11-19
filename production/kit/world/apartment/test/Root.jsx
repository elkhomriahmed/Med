import React from "react";
import { Composition } from "remotion";
import { AptTest } from "./AptTest.jsx";

const C = (id, props) => <Composition key={id} id={id} component={AptTest} durationInFrames={90} fps={30} width={1080} height={1920} defaultProps={props} />;
export const Root = () => (
  <>
    {C("AptKitchenMorning", { time: "morning", view: "kitchenWide" })}
    {C("AptCounterMorning", { time: "morning", view: "counterClose" })}
    {C("AptLivingNight", { time: "night", view: "livingWide", controls: { doorSilhouettes: 1 } })}
    {C("AptCouchNight", { time: "night", view: "couchFromTv" })}
    {C("AptDoorNight", { time: "night", view: "doorClose", controls: { doorSilhouettes: 1, knock: 1 } })}
    {C("AptTvNight", { time: "night", view: "tvClose" })}
    {C("AptWindowMorning", { time: "morning", view: "windowFromInside" })}
    {C("AptWindowNight", { time: "night", view: "windowFromInside" })}
    {C("AptLivingDay", { time: "day", view: "livingWide" })}
    {C("AptBench", { time: "night", view: "livingWide", controls: { doorSilhouettes: 1 }, bench: true })}
  </>
);
