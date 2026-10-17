# Optical effects

The independent optical studies live in the Motiqo Library. Their styles are contained in the implementation, including when used in a Tailwind project. A parent with a defined height is required for QuantumCore, Clustered and the full playground.

## Optical button

Copy `optical-button.tsx`, `optical-shaders.ts`, `native-gl.ts` and `effect-runtime.ts` from Source or download the component ZIP. No additional package is needed.

```tsx
import OpticalPlayground, { OpticalButton } from './optical-button';

export function Playground() {
  return <div className="h-[720px]"><OpticalPlayground /></div>;
}

export function Action() {
  return <OpticalButton auraWidth={24} centerClarity={12} dispersion={96}
    onClick={() => console.log('Launch')} />;
}

```

The standalone button accepts native button attributes, children, `iconOnly`, `paused`, `className`, and every optical setting. Glass settings: refraction (0–100), thickness (0–64), bevelWidth (1–30), frost (0–100), dispersion (0–100), lightSheen (0–100), lightAngle (0–360), darkness (0–100), edgeRim (0–50). Fluid settings: brightness (0–100), waveSpeed (0–200), waveScale (10–200), auraWidth (1–40), centerClarity (0–100), borderBeam (0–100). Interaction settings: hoverGlow (0–300), cursorFlow (0–200), clickRipple (0–200).

The preview wrapper adds `perspective`. It shows one pill labeled Optical Button and has no embedded configuration panels; all live controls belong to the Library inspector. The Library inspector, shared configuration, prompt example and ZIP example use the same parameter values. OpticalButton offers only Default and Optical Study. The former Prism edge and Liquid Bath moods are now the independent SpectralButton and CausticButton catalog entries.

The renderer uses an SDF bevel profile and finite-difference normals, continuous capsule arc-length light transport with wavelength-dependent IOR sampling of a domain-warped procedural light field, frost sampling, a damped pointer spring and click-origin radial deformation. The caustics are an analytic visual model rather than a photon-traced fluid simulation.

## Spectral and caustic buttons

SpectralButton uses the former Prism edge material: brightness 32, aura width 2px and center clarity 100 percent. Its cycle starts 7.3 seconds ahead, runs counterclockwise at 0.73 of the original time rate, and adds a 0.27 hue offset. OpticalButton keeps its original cycle. Its narrow traveling spectrum leaves the glass center clear. CausticButton preserves Liquid Bath: frost 48, aura width 24px and center clarity 12 percent, with light penetrating the volume.

Each has its own card, defaults, live inspector, source files, prompt and ZIP. Each named export is a standalone button; its default export supplies a clean preview. Copy the five files listed by the relevant Source panel, including the shared optical engine and corrected shader. The original OpticalButton shader and its Default and Optical Study rendering are unchanged.

```tsx
import SpectralPreview, { SpectralButton } from './spectral-button';
import CausticPreview, { CausticButton } from './caustic-button';

export function Actions() {
  return <><SpectralButton /><CausticButton /></>;
}

export function Study() {
  return <div className="h-[560px]"><CausticPreview /></div>;
}
```

## Prism button

PrismButton preserves the first optical study as a separate catalog entry, with its original Cartesian liquid field and seven-wavelength refraction. The named export is a standalone action; the default preview presents just one button. All parameters live in the usual inspector.

Copy the six files listed in its Source panel: prism-button.tsx, prism-shaders.ts, optical-button.tsx, optical-shaders.ts, native-gl.ts and effect-runtime.ts. The shared optical owner supplies pointer springs, click ripples, accessibility, pause and GPU cleanup; the two buttons use distinct shaders.

```tsx
import PrismPreview, { PrismButton } from './prism-button';

export function Study() {
  return <div className="h-[560px]"><PrismPreview /></div>;
}

export function Action() {
  return <PrismButton auraWidth={24} centerClarity={12}>Prism Button</PrismButton>;
}
```

OpticalButton closes its perimeter spectrum and folded caustics with integer winding. The Liquid Bath interior samples a continuous Cartesian volume and fades the perimeter chart near the medial axis, so neither the cap join nor the interior introduces a color seam.

## Lenticular button

A moving radial lens refracts a smooth, dark light field through a magnification field, with controllable barrel distortion and chromatic offsets. All button previews use a plain dark background. Lettering remains a crisp HTML layer above the lens. The optical scene is self-contained and does not capture arbitrary DOM or require an external image.

```tsx
import LenticularPreview, { LenticularButton } from './lenticular-button';

export function Action() {
  return <LenticularButton magnification={1.8} lensRadius={29}
    distortion={0.4} tint="#91d9ed" idleMotion />;
}
```

Controls: magnification (1–3), lensRadius (12–40 CSS pixels), distortion (0–1), tint (hex color), idleMotion (boolean). The Precision mood stops the idle drift while retaining pointer control; Soft lens uses a broader, gentler lens. Clicking sends a refractive wave through the lens. The former gridSpacing prop remains accepted for compatibility.

## Photon button

One to three white or tinted pulse heads travel around the capsule, followed by exponential colored trails. Circular phase differences and a tail envelope avoid seams at the cap join. Hover raises the light energy, and keyboard or pointer activation emits a light wave.

```tsx
import PhotonPreview, { PhotonButton } from './photon-button';

export function Action() {
  return <PhotonButton pulseCount={2} speed={0.85} trailLength={0.12}
    pulseWidth={0.009} energy={1} pulseColor="#ecf7ff" trailColor="#638fff" />;
}
```

Controls: pulseCount (1–3), speed (0–2.5), trailLength (0.04–0.22 of the perimeter), pulseWidth (0.003–0.025 of the perimeter), energy (0.2–2.5), pulseColor/trailColor (hex colors). Single pulse and Warm filament are independent moods.

Each of these two studies has seven files listed in its Source panel and ZIP: the component, its shader, button-optics.ts, optical-button.tsx, optical-shaders.ts, native-gl.ts and effect-runtime.ts. Named exports are standalone native actions accepting children, native button attributes, paused, compact, className and style. Default exports provide a clean, full-size preview. No additional runtime dependency is needed.

## Quantum core

Copy `quantum-core.tsx`, `quantum-scene.ts` and `effect-runtime.ts`. Install `three` and, in TypeScript projects, `@types/three`. React Three Fiber is not required.

```tsx
import QuantumCore from './quantum-core';

export default function Example() {
  return <div className="h-[560px]">
    <QuantumCore coreColor="#050b24" accentColor="#315bff"
      rotationSpeed={0.22} finCount={28} bloomIntensity={1} interactive />
  </div>;
}
```

The sphere and two open-pole spherical shells use MeshPhysicalMaterial. Parallel HDR edge tubes follow their curved rims, and 24–32 instanced beveled plates form the inclined turbine. A local environment map provides metallic reflections. A separate selective UnrealBloomPass renders luminous objects with black occluders before compositing the base scene. The SVG reticle contains only diamond vertices, telemetry ticks, counter-rotating arcs and axes. `paused`, `compact` and `className` are also available.

## Clustered filaments

Copy `clustered.tsx` and `effect-runtime.ts`. No additional package is needed.

```tsx
import Clustered from './clustered';

export default function Example() {
  return <div className="h-[560px]">
    <Clustered strandCount={64} clusterCount={6} fallSpeed={1}
      pulseFrequency={1} glowIntensity={1} motionIntensity={1}
      colorPalette={['#082fff', '#3b82f6', '#bae6fd']} interactive />
  </div>;
}
```

Palette entries control the broad aura, fine strands and bead highlights respectively. Each curtain has independent, smooth gusts, travel speeds and changing opening widths, with additional translucent foreground sheets. `motionIntensity` (0–2.5) controls this field motion independently of bead frequency and fall speed. The opening curtain is a continuous effect with no subsequent video scenes or overlays. Beads, comets and local line brightening all evaluate the same strand function. `paused`, `compact` and `className` are also available.

## Runtime behavior

All effects cap device pixel ratio, resize to their container, suspend while offscreen or the document is hidden, respect reduced motion, and release observers, animation frames and GPU resources on unmount. Reduced motion renders a still pose while keeping settings usable. A real GPU remains necessary for animated WebGL previews; frame rate depends on the device, resolution and number of simultaneous effects. The native button retains its accessible HTML action if WebGL is unavailable, and the quantum core retains its SVG reticle.
