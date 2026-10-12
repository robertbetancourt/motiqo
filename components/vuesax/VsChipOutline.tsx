'use client';
// VsChipOutline.tsx — React wrapper for <vs-chip-outline>. Generated from vs-chip-outline.js.
//
//   import { VsChipOutline } from './VsChipOutline';
//   <VsChipOutline variant="soft" onUpdateModelValue={(e) => console.log(e.detail)} />
//
// React 18 and 19, Next.js (App Router and Pages Router), Remix, Vite. Keep it
// next to vs-chip-outline.js and vs-chip-outline.d.ts. Props are written to the element
// directly, so booleans, numbers, arrays and objects arrive with their real
// types in every React version; events arrive as `on…` props; the server
// renders the tag with its attributes and the browser upgrades it.
import { createElement, forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import './vs-chip-outline.js';
import type { VsChipOutlineElement, VsChipOutlineEventMap } from './vs-chip-outline.js';

export interface VsChipOutlineProps extends Omit<HTMLAttributes<HTMLElement>, "label" | "variant" | "size" | "radius" | "tone" | "selectable" | "modelValue" | "dot" | "removable" | "disabled" | "color" | "demo" | "onUpdateModelValue" | "onSelect" | "onRemove"> {
  /** Label · default "Filter" */
  label?: string;
  /** Variant · default "soft" */
  variant?: "soft" | "solid" | "outline";
  /** Size · default "md" */
  size?: "sm" | "md" | "lg";
  /** Radius · default "pill" */
  radius?: "subtle" | "rounded" | "pill";
  /** Tone · default "default" */
  tone?: "default" | "danger" | "warn" | "success";
  /** Selectable · on by default — pass `false` to turn it off */
  selectable?: boolean;
  /** Selected */
  modelValue?: boolean;
  /** Dot */
  dot?: boolean;
  /** Removable */
  removable?: boolean;
  /** Disabled */
  disabled?: boolean;
  /** Color */
  color?: string;
  /** Demo loop */
  demo?: boolean;
  onUpdateModelValue?: (event: VsChipOutlineEventMap["update:modelValue"]) => void;
  onSelect?: (event: VsChipOutlineEventMap["select"]) => void;
  onRemove?: (event: VsChipOutlineEventMap["remove"]) => void;
  children?: ReactNode;
}

const OWN = ["label","variant","size","radius","tone","selectable","modelValue","dot","removable","disabled","color","demo","onUpdateModelValue","onSelect","onRemove"] as const;
const EVENTS = [["update:modelValue","onUpdateModelValue"],["select","onSelect"],["remove","onRemove"]] as const;
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const str = (v: unknown) => (v == null ? undefined : String(v));

/** Attribute values as the element reads them (undefined = attribute absent). */
function toAttributes(p: VsChipOutlineProps): Record<string, string | undefined> {
  return {
    "label": str(p["label"]),
    "variant": str(p["variant"]),
    "size": str(p["size"]),
    "radius": str(p["radius"]),
    "tone": str(p["tone"]),
    "selectable": p["selectable"] === false ? undefined : '',
    "model-value": p["modelValue"] ? '' : undefined,
    "dot": p["dot"] ? '' : undefined,
    "removable": p["removable"] ? '' : undefined,
    "disabled": p["disabled"] ? '' : undefined,
    "color": str(p["color"]),
    "demo": p["demo"] ? '' : undefined,
  };
}

export const VsChipOutline = forwardRef<VsChipOutlineElement, VsChipOutlineProps>(function VsChipOutline(props, ref) {
  const inner = useRef<VsChipOutlineElement | null>(null);
  const setRef = useCallback((node: VsChipOutlineElement | null) => {
    inner.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  const attrs = toAttributes(props);
  const attrsKey = JSON.stringify(attrs);
  useIsoLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    for (const [name, value] of Object.entries(attrs)) {
      if (value === undefined) el.removeAttribute(name);
      else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrsKey]);

  // listeners bound once; they always call the latest handler
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const off = EVENTS.map(([type, prop]) => {
      const fn = (e: Event) => (latest.current[prop] as unknown as ((e: Event) => void) | undefined)?.(e);
      el.addEventListener(type, fn);
      return () => el.removeEventListener(type, fn);
    });
    return () => off.forEach((f) => f());
  }, []);

  const rest: Record<string, unknown> = { ...props };
  for (const k of OWN) delete rest[k];
  delete rest.children;
  return createElement(
    "vs-chip-outline",
    {
      ...rest,
      // server HTML carries the attributes; in the browser the effect above owns them
      ...(typeof window === 'undefined' ? attrs : null),
      ref: setRef,
      suppressHydrationWarning: true,
    },
    props.children,
  );
});

export default VsChipOutline;
