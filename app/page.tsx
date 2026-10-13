import Library from '@/components/library';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { OriginalSources } from '@/lib/catalog';

export default async function Page() {
  // The displayed source is the actual implementation, so it cannot drift.
  const files = {
    'silk-aperture': ['silk-aperture.tsx'],
    'gilded-signal': ['gilded-card.tsx', 'gilded-scene.ts', 'gilded-artwork.ts', 'gilded-shaders.ts'],
    pleat: ['pleat.tsx'], arbor: ['arbor.tsx', 'line-scene.tsx'],
    drawer: ['drawer.tsx', 'line-scene.tsx'], tempo: ['tempo.tsx', 'line-scene.tsx', 'line-solid.ts'],
    gyro: ['gyro.tsx', 'line-scene.tsx', 'line-solid.ts'],
    lantern: ['lantern.tsx', 'line-scene.tsx', 'line-solid.ts'],
    relay: ['relay.tsx', 'line-scene.tsx', 'line-solid.ts'],
  };
  const originalSource: OriginalSources = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([id, names]) => [id,
    await Promise.all(names.map(async name => ({ name, code: await readFile(path.join(process.cwd(), 'components/originals', name), 'utf8') }))),
  ])));
  return <Library originalSource={originalSource} />;
}
