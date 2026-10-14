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
import Crate from './originals/crate';
import GlowNavDemo from './originals/glow-nav-demo';
import LiquidForm from './originals/liquid-form';
import LiquidRelic from './ui/liquid-relic';
import EventHorizon from './ui/event-horizon';
import Pulse from './originals/pulse';
import District from './originals/district';
import Halo from './originals/halo';
import type { ElementId } from '@/lib/catalog';
import type { Settings } from '@/lib/element-controls';

const GildedCard = dynamic(() => import('./originals/gilded-card'), { ssr: false });

export function Demo({ id, paused = false, expanded = false, silkLight, settings={} }: { id: ElementId; paused?: boolean; expanded?: boolean; silkLight?: 'dawn' | 'dusk';settings?:Settings }) {
  const reduced = useReducedMotion();
  const still = paused || reduced;
  const motion={intensity:typeof settings.intensity==='number'?settings.intensity:1,speed:typeof settings.speed==='number'?settings.speed:1};
  return <div className={`demo demo-${id} ${still ? 'demo-still' : ''}`}>
    {id==='halo'&&<Halo {...motion} compact={!expanded} paused={!!still} count={settings.count as number|undefined} dotSize={settings.dotSize as number|undefined}/>}
    {id==='district'&&<District {...motion} compact={!expanded} paused={!!still}/>}
    {id==='pulse'&&<Pulse compact={!expanded} paused={!!still} speed={settings.speed as number|undefined} amplitude={settings.amplitude as number|undefined} accent={settings.accent as string|undefined}/>}
    {id==='event-horizon'&&<EventHorizon compact={!expanded} paused={!!still} restStyle={settings.restStyle as 'image'|'particles'|undefined} strength={settings.strength as number|undefined} radius={settings.radius as number|undefined} particleSpread={settings.particleSpread as number|undefined} liquid={settings.liquid as number|undefined} returnSpeed={settings.returnSpeed as number|undefined} sculptureScale={settings.sculptureScale as number|undefined}/>}
    {id==='liquid-relic'&&<LiquidRelic compact={!expanded} paused={!!still} restStyle={settings.restStyle as 'image'|'particles'|undefined} strength={settings.strength as number|undefined} radius={settings.radius as number|undefined} particleSpread={settings.particleSpread as number|undefined} liquid={settings.liquid as number|undefined} returnSpeed={settings.returnSpeed as number|undefined} sculptureScale={settings.sculptureScale as number|undefined}/>}
    {id === 'crate' && <Crate {...motion} count={typeof settings.count==='number'?settings.count:8} compact={!expanded} paused={!!still} />}
    {id === 'glow-nav' && <GlowNavDemo compact={!expanded} paused={!!still} duration={typeof settings.duration==='number'?settings.duration:.65} accent={typeof settings.accent==='string'?settings.accent:undefined}/>}
    {id === 'liquid-sculpture' && <LiquidForm compact={!expanded} paused={!!still} shape={settings.shape as 'knot'|'orbit'|'bloom'|undefined} liquidity={settings.liquidity as number|undefined} relief={settings.relief as number|undefined} scale={settings.scale as number|undefined} tint={settings.tint as string|undefined}/>}
    {id === 'lantern' && <Lantern {...motion} compact={!expanded} paused={!!still} />}
    {id === 'gyro' && <Gyro {...motion} compact={!expanded} paused={!!still} />}
    {id === 'arbor' && <Arbor {...motion} compact={!expanded} paused={!!still} />}
    {id === 'drawer' && <Drawer {...motion} compact={!expanded} paused={!!still} />}
    {id === 'tempo' && <Tempo {...motion} compact={!expanded} paused={!!still} />}
    {id === 'pleat' && <Pleat {...motion} compact={!expanded} paused={!!still} />}
    {id === 'gilded-signal' && <GildedCard compact={!expanded} paused={!!still} backgroundSrc={settings.backgroundSrc as string|undefined}/>}
    {id === 'silk-aperture' && <SilkAperture paused={!!still} compact={!expanded} light={silkLight} minimal showControls={false} />}

  </div>;
}
