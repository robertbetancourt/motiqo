"use client";
import ChimeStage, { type ChimeStageProps } from "./chime-stage";
export type PrismChimeProps = Omit<ChimeStageProps, "prism" | "theme">;
export default function PrismChime(props: PrismChimeProps) {
  return <ChimeStage {...props} prism />;
}
