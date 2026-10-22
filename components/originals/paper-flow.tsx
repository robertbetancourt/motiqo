"use client";
import FlowGallery, { type FlowOptions } from "./flow-gallery";
export type PaperFlowProps = Pick<
  FlowOptions,
  | "items"
  | "mode"
  | "direction"
  | "speed"
  | "deformation"
  | "perspective"
  | "inertia"
  | "loop"
  | "backgroundColor"
  | "paused"
  | "compact"
  | "className"
>;
export default function PaperFlow(props: PaperFlowProps) {
  return <FlowGallery {...props} variant="paper" />;
}
