import Library from '@/components/library';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { OriginalSources } from '@/lib/catalog';

export default async function Page({searchParams}: {searchParams: Promise<{element?: string; saved?: string}>}) {
  // The displayed source is the actual implementation, so it cannot drift.
  const files = {
    halo:['halo.tsx','halo-math.ts'],
    district:['district.tsx','line-scene.tsx','line-solid.ts'],
    pulse:['pulse.tsx'],
    'event-horizon':['../ui/event-horizon.tsx','../ui/liquid-relic.tsx','../ui/liquid-particle-engine.ts','../ui/liquid-particle-shaders.ts','../../public/media/event-horizon.svg'],
    'liquid-relic': ['../ui/liquid-relic.tsx','../ui/liquid-particle-engine.ts','../ui/liquid-particle-shaders.ts','../../public/media/liquid-relic.svg'],
    'silk-aperture': ['silk-aperture.tsx'],
    'gilded-signal': ['gilded-card.tsx', 'gilded-scene.ts', 'gilded-artwork.ts', 'gilded-shaders.ts'],
    pleat: ['pleat.tsx'], arbor: ['arbor.tsx', 'line-scene.tsx'],
    drawer: ['drawer.tsx', 'line-scene.tsx'], tempo: ['tempo.tsx', 'line-scene.tsx', 'line-solid.ts'],
    gyro: ['gyro.tsx', 'line-scene.tsx', 'line-solid.ts'],
    lantern: ['lantern.tsx', 'line-scene.tsx', 'line-solid.ts'],
    crate: ['crate.tsx', 'crate-scene.ts'],
    'glow-nav': ['glow-nav.tsx'],
    'liquid-sculpture': ['liquid-form.tsx', 'liquid-form-shaders.ts'],
  };
  const originalSource: OriginalSources = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([id, names]) => [id,
    await Promise.all(names.map(async name => ({ name:path.basename(name), code: await readFile(path.join(process.cwd(), 'components/originals', name), 'utf8') }))),
  ])));
  const params = await searchParams;
  return <Library originalSource={originalSource} initialElement={params.element} initialSaved={params.saved === '1'} />;
}
