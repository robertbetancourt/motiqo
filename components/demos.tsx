'use client';

import dynamic from 'next/dynamic';
import { useReducedMotion } from 'motion/react';
import SilkAperture from './originals/silk-aperture';
import Pleat from './originals/pleat';
import Arbor from './originals/arbor';
import Drawer from './originals/drawer';
import Tempo from './originals/tempo';
import Gyro from './originals/gyro';
import Lantern from './originals/lantern';
import Relay from './originals/relay';
import type { ElementId } from '@/lib/catalog';

const GildedCard = dynamic(() => import('./originals/gilded-card'), { ssr: false });

export function Demo({ id, paused = false, expanded = false, silkLight }: { id: ElementId; paused?: boolean; expanded?: boolean; silkLight?: 'dawn' | 'dusk' }) {
  const reduced = useReducedMotion();
  const still = paused || reduced;
  return <div className={`demo demo-${id} ${still ? 'demo-still' : ''}`}>
    {id === 'relay' && <Relay compact={!expanded} paused={!!still} />}
    {id === 'lantern' && <Lantern compact={!expanded} paused={!!still} />}
    {id === 'gyro' && <Gyro compact={!expanded} paused={!!still} />}
    {id === 'arbor' && <Arbor compact={!expanded} paused={!!still} />}
    {id === 'drawer' && <Drawer compact={!expanded} paused={!!still} />}
    {id === 'tempo' && <Tempo compact={!expanded} paused={!!still} />}
    {id === 'pleat' && <Pleat compact={!expanded} paused={!!still} />}
    {id === 'gilded-signal' && <GildedCard compact={!expanded} paused={!!still} />}
    {id === 'silk-aperture' && <SilkAperture paused={!!still} compact={!expanded} light={silkLight} minimal showControls={false} />}

  </div>;
}
