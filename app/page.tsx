import Library from '@/components/library';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export default async function Page() {
  // The displayed source is the actual implementation, so it cannot drift.
  const files = ['silk-aperture.tsx', 'gilded-card.tsx', 'gilded-scene.ts', 'gilded-artwork.ts', 'gilded-shaders.ts'];
  const sources = await Promise.all(files.map(async name => ({ name, code: await readFile(path.join(process.cwd(), 'components/originals', name), 'utf8') })));
  const originalSource = { 'silk-aperture': [sources[0]], 'gilded-signal': sources.slice(1) };
  return <Library originalSource={originalSource} />;
}
