// vs-chip-outline.d.ts — TypeScript types for <vs-chip-outline>. Generated from vs-chip-outline.js.
// Keep it next to vs-chip-outline.js: `import './vs-chip-outline.js'` picks it up, and
// document.querySelector('vs-chip-outline') comes back as a typed VsChipOutlineElement.

/** Attributes of <vs-chip-outline> (write them on the tag, kebab-case). */
export interface VsChipOutlineAttributes {
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
  selectable?: boolean | "true" | "false" | "";
  /** Selected */
  "model-value"?: boolean | "true" | "false" | "";
  /** Dot */
  dot?: boolean | "true" | "false" | "";
  /** Removable */
  removable?: boolean | "true" | "false" | "";
  /** Disabled */
  disabled?: boolean | "true" | "false" | "";
  /** Color */
  color?: string;
  /** Demo loop */
  demo?: boolean | "true" | "false" | "";
}

/** Events <vs-chip-outline> dispatches (they bubble and cross shadow roots). */
export interface VsChipOutlineEventMap {
  "update:modelValue": CustomEvent<any>;
  select: CustomEvent<any>;
  remove: CustomEvent<any>;
}

export interface VsChipOutlineElement extends HTMLElement {
  addEventListener<K extends keyof VsChipOutlineEventMap>(type: K, listener: (this: VsChipOutlineElement, ev: VsChipOutlineEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: VsChipOutlineElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener<K extends keyof VsChipOutlineEventMap>(type: K, listener: (this: VsChipOutlineElement, ev: VsChipOutlineEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: VsChipOutlineElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

declare global {
  interface HTMLElementTagNameMap {
    "vs-chip-outline": VsChipOutlineElement;
  }
}
