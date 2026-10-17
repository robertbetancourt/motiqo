# Generative studies

Five independent React components are available through Library, the inspector, Source, ZIP downloads and CLI. Styles are scoped and embedded; Tailwind is optional. Only BokehTerrain and OpalineOrb require Three.js. All components support `paused`, `compact`, `className`, bounded device pixel ratio, reduced motion and offscreen/document visibility suspension. No reference videos, external images or fonts are required at runtime.

## SacredLotus

```tsx
import SacredLotus from './sacred-lotus';

<div style={{ height: 620 }}>
  <SacredLotus duration={10} petalCount={12} layerCount={3}
    statusText="Loading..." colorScheme="aurora" interactive />
</div>
```

`progress` optionally controls the 0–100 pose. Without it, a smooth round trip takes `duration` seconds to reach 100 and the same time to return, avoiding a reset flash. Seeded points gather into orbital nodes, then thin radial petals widen into overlapping counter-rotating crowns, then round into a circular halo. `colorScheme` accepts `aurora`, `glacier`, `ember` or `{inner, middle, outer}` hex colors. The inspector offers automatic or controlled progress. The displayed progressbar is labeled and uses a non-live numeric update to avoid repeated screen-reader announcements.

## IrisTurbine

```tsx
import IrisTurbine from './iris-turbine';

<div style={{ height: 620 }}>
  <IrisTurbine autoDemo interactive maxSpeed={210}
    redlineThreshold={55} bladeCount={24} />
</div>
```

`speed` optionally controls the km/h target, with damped interpolation. Otherwise, `autoDemo` follows a 24-second acceleration/deceleration sequence; disable it for manual driving with a slider. Hold the preview or Space to accelerate, release to coast, or use the wheel and arrow keys. A slider-selected target is sustained. Two staggered crowns of 24 curved petal blades expand from the inner aperture. Each incoming crown grows to replace the fading outer one without a visible reset. Speed controls angular motion, fill and glow. Gear pulses use a continuous envelope. `cruiseColor` and `ignitionColor` configure both palettes. At `redlineThreshold`, violet begins smoothly transitioning to amber. Gear boundaries are 25, 50, 85, 125 and 160 km/h, with an impulse on an upward shift. `showTelemetry` optionally adds the reference's small static temperature/time detail. This is illustrative telemetry, not vehicle data.

## BokehTerrain

```tsx
import BokehTerrain from './bokeh-terrain';

<div style={{ height: 620 }}>
  <BokehTerrain lineCount={70} pointsPerLine={220} waveSpeed={1}
    waveHeight={1.5} primaryColor="#2563eb" secondaryColor="#7c3aed"
    accentColor="#fef9c3" showStars interactive />
</div>
```

The field overscans the camera frustum at its far edge, filling wide previews without exposed side boundaries. The default 15,400 points occupy a true XZ plane with dense X sampling. The vertex shader combines crossed waves, 3D simplex gradient noise and a local pointer wave. Camera-space distance to a focal plane adjusts sprite size and alpha; additive Gaussian sprites combine into luminous crests. A separate set of 400 drifting stars can be disabled. `showTitle` enables the optional hero copy; `children` supplies a custom title block. The default preview contains only the effect. Geometry buffers are replaced only when the row/point count changes and old GPU buffers are released first.

## OpalineOrb

```tsx
import OpalineOrb from './opaline-orb';

<div style={{ height: 620 }}>
  <OpalineOrb layerCount={4} ringDensity={38} morphSpeed={1}
    morphIntensity={1} interactive listening={false}
    colorPalette={{coreBlue:'#8ab8f8',warmPeach:'#ffbe98',
      outerLavender:'#c4b5fd',lineColor:'#ffffff'}} />
</div>
```

A dark ink background separates the luminous membranes from their backdrop. High-subdivision spheres share one geometry and have separate phase-shifted shader uniforms. Six-lobed displacement and simplex noise deform each membrane. Concentric, derivative-antialiased dotted contours follow the viewing axis; five-lobed phase-shifted membranes surround a softly deformed luminous core. The inspector exposes the palette's four colors separately; exported examples reconstruct `colorPalette` as an object. `listening` adds an elastic increase in activity; it is a visual state and does not request microphone access.

## OrbitAgent

```tsx
import OrbitAgent from './orbit-agent';

<div style={{ height: 620 }}>
  <OrbitAgent ringCount={5} orbitSpeed={1} accentColor="#c4b5fd"
    onAgentClick={mood => console.log(mood)} interactive />
</div>
```

The larger iridescent scalloped agent follows the pointer with its oval eyes, blinks and breathes. Its rotating shell stays independent of the face. Continuous eyelids retain the full width of its oval eyes; there is no mouth. Its expression is selected with `agentMood`; click, Enter or Space trigger a temporary happy greeting without changing that selection. A click adds independent damped jump, squash and orbital expansion impulses, plus a star burst. Twenty-three seeded stars and closed Catmull-Rom loops form its atmosphere. `agentMood` defaults to `idle`. `onAgentClick` reports the currently selected mood; it does not request a mood change.

## Library tags

Card and inspector tags are keyboard-operable buttons. Activating a tag filters by exact, case-insensitive tag identity, clears conflicting search/category filters and preserves Saved mode. A removable chip displays the active filter. The URL stores `?tag=WebGL`, including across refresh, component navigation and browser back/forward. Search and category filters can further narrow results. Dependencies remain informational labels.

Animation smoothness depends on the device and canvas size. Effects pause when offscreen and release observers, event handlers, materials, geometry and renderers when unmounted. A reduced-motion preview renders a complete static pose rather than an empty initial frame.
