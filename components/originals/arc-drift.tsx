"use client";
import LiquidRail, { type LiquidRailProps } from "./liquid-rail";
export default function ArcDrift(props: Omit<LiquidRailProps, "variant">) {
  return <LiquidRail {...props} variant="horizontal" />;
}
