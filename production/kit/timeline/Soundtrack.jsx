// Voice + music bed (steady, well under the voice) + SFX that land on their words + looping ambience beds per place.
// Final -14 LUFS master is done after render (timeline/finish.sh).
import React from "react";
import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";

// vo:    { src, startSec }
// music: { src, startSec, volume, endSec?, fade? }            fades out over `fade` s before endSec
// sfx:   [{ src, at (s), volume, trimEnd? (s), offset? (s) }]
// beds:  [{ src, from (s), to (s), volume }]  pre-mixed audio played from `from` to `to`
export const Soundtrack = ({ vo, music, sfx = [], beds = [] }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const F = (s) => Math.max(0, Math.round(s * fps));
  return (
    <>
      <Audio src={staticFile(vo.src)} startFrom={F(vo.startSec ?? 0)} volume={1} />
      {music && (() => {
        const end = music.endSec ? F(music.endSec) : durationInFrames, fd = F(music.fade ?? 0.4), v = music.volume ?? 0.07;
        return <Sequence from={0} durationInFrames={Math.max(1, end)} layout="none">
          <Audio src={staticFile(music.src)} startFrom={F(music.startSec ?? 0)}
            volume={(f) => v * interpolate(f, [0, 3, Math.max(4, end - fd), end], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
        </Sequence>;
      })()}
      {beds.map((b, i) => (   // pre-mixed beds (one file per stretch, fades baked in): played as-is
        <Sequence key={"b" + i} from={F(b.from)} durationInFrames={Math.max(1, F(b.to) - F(b.from))} layout="none">
          <Audio src={staticFile(b.src)} volume={b.volume ?? 1} />
        </Sequence>
      ))}
      {sfx.map((s, i) => (
        <Sequence key={i} from={F(s.at)} durationInFrames={s.trimEnd ? F(s.trimEnd) : undefined} layout="none">
          <Audio src={staticFile(s.src)} startFrom={F(s.offset ?? 0)} volume={s.volume ?? 0.5} />
        </Sequence>
      ))}
    </>
  );
};
