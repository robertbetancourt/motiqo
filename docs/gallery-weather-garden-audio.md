# Gallery, atmosphere and living type

All five studies are available in the collection, inspector, Source, ZIP and CLI. Configuration stays in the normal inspector; gallery arrows, spectrum playback and the garden palette bar are part of the components. The six gallery images and both recordings ship as local assets in ZIP and CLI exports.

## Tidal / WaterRippleCarousel

```tsx
import WaterRippleCarousel from './water-ripple-carousel';

export default function Example() {
  return <div style={{ height: 620 }}>
    <WaterRippleCarousel duration={1450} strength={1} autoplay={2500}
      slides={[
        { image: '/coast.jpg', title: 'Where the water rests.', caption: 'COASTAL STUDIES' },
        { image: '/mountain.jpg', title: 'A quieter latitude.', caption: 'NORTHERN LIGHT' },
      ]} />
  </div>;
}
```

A native WebGL2 wavefront refracts both images, with a smaller trailing capillary wake. Pointer activation supplies the exact wave origin. Only the image and two SVG arrow buttons are visible. Navigation also supports swipes and arrow keys while the stage is focused. Every change starts a new wave; the static fallback layer is used only when WebGL2 is unavailable. Requests during a transition retain the latest requested destination. Autoplay starts a new transition every 2.5 seconds (including the previous animation time) and waits while hovered, focused, hidden, offscreen, paused or reduced motion is enabled.

`slides` accepts `image`, `title`, `caption`, `alt`, `palette` (`tide`, `ember`, `glacier`, `violet`) and `seed`. Missing or failed images use original generated landscape studies. Cross-origin photographs must allow CORS for texture upload. Images use cover sampling without stretching. A DOM crossfade remains usable if WebGL2 is unavailable. Additional props: `ink`, `height`, `style`, `className`, `onChange`, `ariaLabel`, `paused` and `compact`.

## Atlas / ApertureCarousel

```tsx
import ApertureCarousel from './aperture-carousel';

export default function Example() {
  return <div style={{ height: 620 }}>
    <ApertureCarousel duration={1250} autoplay={3000} />
  </div>;
}
```

The same image and navigation contract with a distinct six-leaf iris, an illuminated opening and edge refraction on every change. The local image sequence starts at a different photograph. The stage contains only the image and arrows. Autoplay starts a new reveal every three seconds.

## ThermalSmoke

```tsx
import ThermalSmoke from './thermal-smoke';

export default function Example() {
  return <div style={{ height: 650 }}>
    <ThermalSmoke city="Stockholm" temperature={26} condition="Partly cloudy"
      warmColor="#ffb55c" coldColor="#729eff" smokeDensity={1.35}
      flowSpeed={0.8} autoTriggerIntro />
  </div>;
}
```

The ring uses native WebGL2, nested domain-warped fBm and analytic curl of a smooth scalar potential. Separate seeds, radial transport and opacity masks keep the warm and cold plumes distinct. The center remains dark. Entry animates expansion and the two-degree temperature count; reduced motion shows the complete state immediately. The effect sits directly on a black canvas without a phone frame or mockup. Only the city, temperature, condition, wind, humidity and pressure remain visible. There are no hourly rings, forecast buttons or replay control. This component does not request live weather. `paused`, `compact` and `className` are also available.

## RadialSpectrum

```tsx
import RadialSpectrum from './radial-spectrum';

export default function Example() {
  return <div style={{ height: 620 }}>
    <RadialSpectrum track="momentum" subtitleBottom="MOTIQO"
      barCount={260} radius={175} sensitivity={1.2} />
  </div>;
}
```

Click or keyboard-activate the center to start audio. `track` selects `momentum` or `temporal`, using the two recordings in `public/media/music/`. The inspector places Track directly below Mood. The title follows the selected track unless `trackTitle` is set. The open 290-degree ring samples a real AnalyserNode (`fftSize: 1024`, smoothing `0.85`), with logarithmic frequency sampling, waveform RMS and separate attack/release smoothing. Bass and loudness gently alter the radius; spectral energy drives individual needles. Idle breathing remains subtle. The center uses inset positioning independent of button press transforms.

The standalone `audioUrl` prop can still override the local recording, but is not exposed in the inspector. Remote audio must permit CORS. Audio starts only from a user gesture; changing tracks, leaving the viewport, hiding the document or enabling `paused` suspends playback. Unmounting closes the context and releases resources. `compact` and `className` are also available.

## TypeGarden

```tsx
import TypeGarden from './type-garden';

export default function Example() {
  return <div style={{ height: 620 }}>
    <TypeGarden defaultText={'Type\nGarden'} editable palette="Rose Noir"
      motionMode="breeze" flowerType="mixed" arrangement="wild"
      floralDensity={1} showButterflies showControls />
  </div>;
}
```

Requires `motion`. A native textarea handles selection, IME, cursor movement and multiline editing. Layered glyphs, drawn stems, veined pointed leaves, detailed flowers and buds sit behind and in front of the typography. `flowerType` accepts `rose`, `cosmos`, `poppy`, `tulip` or `mixed`. `arrangement` accepts `wild`, `climbing` or `meadow`. Seeded plans vary branch count, stem curves, flower height, rotation, size, front/back placement, leaf positions, sway and bloom timing. Prefix/suffix reconciliation retains the identity of surviving letters during edits. Departing glyphs shrink before unmounting.

`palette` accepts `Rose Noir`, `Midnight`, `Orchid`, `Tomato`, `Moss`, `Paper`, or a custom `{ background, text, foliage, flowers, flowerStrokes }` object. `motionMode` accepts `breeze`, `grow`, `pulse` and `flutter`; `floralDensity` spans `0.5–2`. `showButterflies` and `showControls` are independent. Optional `onTextChange` and `onPaletteChange` callbacks synchronize a host application. `paused`, reduced motion and visibility suspend continuous animation. No remote font is required.

## Rendering and distribution

Canvas effects cap device pixel ratio and suspend their clocks offscreen or while the document is hidden. Shaders restore after context loss and release their resources on unmount. Performance depends on the GPU, canvas size and active effects; 60 FPS is not guaranteed on every device. All implementation helpers are included in Source and ZIP; the CLI deduplicates shared files when installing both galleries.
