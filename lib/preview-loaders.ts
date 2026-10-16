'use client';
import type {ElementId} from '@/registry/element-ids';

// Share in-flight imports between anticipation and the rendered preview.
function once<T>(load:()=>Promise<T>){
  let pending:Promise<T>|undefined;
  return()=>pending??=load().catch(error=>{pending=undefined;throw error;});
}
export const previewLoaders={
  'silk-aperture':once(()=>import('../components/originals/silk-aperture')),
  'pleat':once(()=>import('../components/originals/pleat')),
  'arbor':once(()=>import('../components/originals/arbor')),
  'drawer':once(()=>import('../components/originals/drawer')),
  'tempo':once(()=>import('../components/originals/tempo')),
  'gyro':once(()=>import('../components/originals/gyro')),
  'lantern':once(()=>import('../components/originals/lantern')),
  'crate':once(()=>import('../components/originals/crate')),
  'glow-nav':once(()=>import('../components/originals/glow-nav-demo')),
  'liquid-sculpture':once(()=>import('../components/originals/liquid-form')),
  'liquid-relic':once(()=>import('../components/ui/liquid-relic')),
  'event-horizon':once(()=>import('../components/ui/event-horizon')),
  'pulse':once(()=>import('../components/originals/pulse')),
  'district':once(()=>import('../components/originals/district')),
  'halo':once(()=>import('../components/originals/halo')),
  'nexus':once(()=>import('../components/originals/nexus')),
  'orbit':once(()=>import('../components/originals/orbit')),
  'aura':once(()=>import('../components/originals/aura')),
  'luma':once(()=>import('../components/originals/luma')),
  'galaxy':once(()=>import('../components/originals/galaxy')),
  'holdings':once(()=>import('../components/originals/holdings')),
  'companion':once(()=>import('../components/originals/companion')),
  'deck':once(()=>import('../components/originals/deck')),
  'meridian':once(()=>import('../components/originals/meridian')),
  'resonance':once(()=>import('../components/originals/resonance')),
  'sleeve':once(()=>import('../components/originals/sleeve')),
  'helix':once(()=>import('../components/originals/helix')),
  'constellation':once(()=>import('../components/originals/constellation')),
  'sentiment':once(()=>import('../components/originals/sentiment')),
  'gilded-signal':once(()=>import('../components/originals/gilded-card')),
} satisfies Record<ElementId,()=>Promise<unknown>>;
export const preloadPreview=(id:ElementId)=>previewLoaders[id]();
