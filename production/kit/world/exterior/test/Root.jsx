import React from "react";
import { Composition } from "remotion";
import { ExteriorTest } from "./ExteriorTest.jsx";

const C = (id, shot, extra = {}) => <Composition id={id} component={ExteriorTest} durationInFrames={300} fps={30} width={1080} height={1920} defaultProps={{ shot, ...extra }} />;
export const Root = () => (
  <>
    {C("ExtNightWide", "nightWide")}
    {C("ExtDuskJetty", "duskJetty")}
    {C("ExtDayJetty", "dayJetty")}
    {C("ExtWinterGulls", "winterGulls")}
    {C("ExtTowardTown", "towardTown")}
    {C("ExtWindowView", "windowView")}
    {C("ExtBench", "nightWide", { bench: true })}
    {C("ExtBenchJetty", "duskJetty", { bench: true })}
  </>
);
