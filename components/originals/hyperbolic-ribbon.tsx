"use client";
import FlowGallery, { type FlowOptions } from "./flow-gallery";
export type HyperbolicRibbonProps = FlowOptions;
export default function HyperbolicRibbon(props: HyperbolicRibbonProps) {
  return <FlowGallery {...props} variant="ribbon" />;
}
