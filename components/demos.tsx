'use client';

import dynamic from 'next/dynamic';
import { useId } from 'react';
import { useReducedMotion } from 'motion/react';
import MagnetLines from './references/MagnetLines';
import CircularText from './references/CircularText';
import FolderFloat from './references/FolderFloat';
import SilkAperture from './originals/silk-aperture';
import type { ElementId } from '@/lib/catalog';

const Terrain = dynamic(() => import('@lucasmarkes/hairline/react').then(m => m.Terrain), { ssr: false });
const GildedCard = dynamic(() => import('./originals/gilded-card'), { ssr: false });
const ringText = 'GOOD THINGS TAKE A LITTLE MOTION · ';

export function Demo({ id, paused = false, expanded = false, silkLight }: { id: ElementId; paused?: boolean; expanded?: boolean; silkLight?: 'dawn' | 'dusk' }) {
  const reduced = useReducedMotion();
  const ringId = useId();
  const still = paused || reduced;
  return <div className={`demo demo-${id} ${still ? 'demo-still' : ''}`}>
    {id === 'gilded-signal' && <GildedCard compact={!expanded} paused={!!still} />}
    {id === 'silk-aperture' && <SilkAperture paused={!!still} compact={!expanded} light={silkLight} minimal showControls={false} />}
    {id === 'magnet-lines' && <MagnetLines rows={9} columns={11} containerSize="240px" lineColor="var(--accent)" lineWidth="2px" lineHeight="15px" style={{ width: '290px' }} paused={!!still} />}
    {id === 'circular-text' && <>
      {still ? <svg className="static-ring" viewBox="0 0 220 220" aria-label={ringText}><defs><path id={ringId} d="M 110,110 m -82,0 a 82,82 0 1,1 164,0 a 82,82 0 1,1 -164,0" /></defs><text><textPath href={`#${ringId}`}>{ringText}</textPath></text></svg> : <CircularText text={ringText} spinDuration={24} onHover="slowDown" className="prism-ring" />}
      <svg className="ring-mark" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 2v44M2 24h44M8.5 8.5l31 31m0-31-31 31" /></svg>
    </>}
    {id === 'folder-float' && <FolderFloat label="Little ideas" sublabel="03 things worth keeping" items={['Make it move', 'Stay curious', 'Try something']} trigger="click" physics={false} width={164} height={108} spread={125} lift={45} folderColor="#ac4037" frontColor="#db6554" paperColor="#f3dcc4" itemColor="#f0dfce" itemTextColor="#402c27" labelColor="#f7e7df" />}
    {id === 'terrain' && <div className="terrain-figure" style={still ? { pointerEvents: 'none' } : undefined}><Terrain theme="dark" intensity={still ? 0 : 0.5} /></div>}
  </div>;
}
