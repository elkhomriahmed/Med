import React from "react";
import { Composition } from "remotion";
import { OfficeTest } from "./OfficeTest.jsx";

const C = (id, props) => <Composition key={id} id={id} component={OfficeTest} durationInFrames={90} fps={30} width={1080} height={1920} defaultProps={props} />;
const FULL = { line1: 1, line2: 1, graph: 1, title: 1 };
export const Root = () => (
  <>
    {C("OfficeWide", { view: "officeWide", board: FULL })}
    {C("OfficeBoard", { view: "boardClose", board: FULL, figures: false })}
    {C("OfficeBoardHalf", { view: "boardClose", board: { line1: 1, line2: 0.5, graph: 0.6, title: 0 }, figures: false })}
    {C("OfficeBoardWide", { view: "boardWide", board: FULL })}
    {C("OfficeBoardText", { view: "boardText", board: FULL, figures: false })}
    {C("OfficeWindow", { view: "windowView", board: FULL, figures: false })}
    {C("OfficeDesk", { view: "deskClose", board: { line1: 1, line2: 1 } })}
    {C("OfficeBench", { view: "officeWide", board: FULL, bench: true })}
  </>
);
