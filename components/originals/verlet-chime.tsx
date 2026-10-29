"use client";
import ChimeStage, { type ChimeStageProps } from "./chime-stage";
export type VerletChimeProps = Omit<ChimeStageProps, "prism">;
export default function VerletChime(props: VerletChimeProps) {
  return <ChimeStage {...props} />;
}
