'use client';

import dynamic from 'next/dynamic';
import {useEffect,useState} from 'react';
import {previewLoaders} from '@/lib/preview-loaders';
import { useReducedMotion } from 'motion/react';

import type {SentimentProps} from './originals/sentiment';

import type { ElementId } from '@/lib/catalog';
import type { Settings } from '@/lib/element-controls';

const SilkAperture=dynamic(previewLoaders['silk-aperture'],{ssr:false});
const Pleat=dynamic(previewLoaders['pleat'],{ssr:false});
const Arbor=dynamic(previewLoaders['arbor'],{ssr:false});
const Drawer=dynamic(previewLoaders['drawer'],{ssr:false});
const Tempo=dynamic(previewLoaders['tempo'],{ssr:false});
const Gyro=dynamic(previewLoaders['gyro'],{ssr:false});
const Lantern=dynamic(previewLoaders['lantern'],{ssr:false});
const Crate=dynamic(previewLoaders['crate'],{ssr:false});
const GlowNavDemo=dynamic(previewLoaders['glow-nav'],{ssr:false});
const LiquidForm=dynamic(previewLoaders['liquid-sculpture'],{ssr:false});
const LiquidRelic=dynamic(previewLoaders['liquid-relic'],{ssr:false});
const EventHorizon=dynamic(previewLoaders['event-horizon'],{ssr:false});
const Pulse=dynamic(previewLoaders['pulse'],{ssr:false});
const District=dynamic(previewLoaders['district'],{ssr:false});
const Halo=dynamic(previewLoaders['halo'],{ssr:false});
const Nexus=dynamic(previewLoaders['nexus'],{ssr:false});
const Orbit=dynamic(previewLoaders['orbit'],{ssr:false});
const Aura=dynamic(previewLoaders['aura'],{ssr:false});
const Luma=dynamic(previewLoaders['luma'],{ssr:false});
const Galaxy=dynamic(previewLoaders['galaxy'],{ssr:false});
const Holdings=dynamic(previewLoaders['holdings'],{ssr:false});
const Companion=dynamic(previewLoaders['companion'],{ssr:false});
const Deck=dynamic(previewLoaders['deck'],{ssr:false});
const Meridian=dynamic(previewLoaders['meridian'],{ssr:false});
const Resonance=dynamic(previewLoaders['resonance'],{ssr:false});
const Sleeve=dynamic(previewLoaders['sleeve'],{ssr:false});
const Helix=dynamic(previewLoaders['helix'],{ssr:false});
const Constellation=dynamic(previewLoaders['constellation'],{ssr:false});
const Sentiment=dynamic(previewLoaders['sentiment'],{ssr:false});
const GildedCard=dynamic(previewLoaders['gilded-signal'],{ssr:false});
const Stratum=dynamic(previewLoaders['stratum'],{ssr:false});
const Charge=dynamic(previewLoaders['charge'],{ssr:false});
const Inkshift=dynamic(previewLoaders['inkshift'],{ssr:false});
const Atelier=dynamic(previewLoaders['atelier'],{ssr:false});

const PrismPreview=dynamic(previewLoaders['prism-button'],{ssr:false});
const SpectralPreview=dynamic(previewLoaders['spectral-button'],{ssr:false});
const CausticPreview=dynamic(previewLoaders['caustic-button'],{ssr:false});
const LenticularPreview=dynamic(previewLoaders['lenticular-button'],{ssr:false});
const PhotonPreview=dynamic(previewLoaders['photon-button'],{ssr:false});
const OpticalPlayground=dynamic(previewLoaders['optical-button'],{ssr:false});
const QuantumCore=dynamic(previewLoaders['quantum-core'],{ssr:false});
const Clustered=dynamic(previewLoaders['clustered'],{ssr:false});

const WaterRippleCarousel=dynamic(previewLoaders['water-ripple-carousel'],{ssr:false});
const ApertureCarousel=dynamic(previewLoaders['aperture-carousel'],{ssr:false});
const ThermalSmoke=dynamic(previewLoaders['thermal-smoke'],{ssr:false});
const RadialSpectrum=dynamic(previewLoaders['radial-spectrum'],{ssr:false});
const TypeGarden=dynamic(previewLoaders['type-garden'],{ssr:false});

const SacredLotus=dynamic(previewLoaders['sacred-lotus'],{ssr:false});
const IrisTurbine=dynamic(previewLoaders['iris-turbine'],{ssr:false});
const BokehTerrain=dynamic(previewLoaders['bokeh-terrain'],{ssr:false});
const OpalineOrb=dynamic(previewLoaders['opaline-orb'],{ssr:false});
const OrbitAgent=dynamic(previewLoaders['orbit-agent'],{ssr:false});

export function Demo({ id, paused = false, expanded = false, autoDemo=false, silkLight, settings={},onSettingsChange }: { id: ElementId; paused?: boolean; expanded?: boolean; autoDemo?:boolean; silkLight?: 'dawn' | 'dusk';settings?:Settings;onSettingsChange?:(patch:Settings)=>void }) {
  const prefersReduced = useReducedMotion();
  const [hydrated,setHydrated] = useState(false);
  useEffect(()=>setHydrated(true),[]);
  const reduced = hydrated && prefersReduced;
  const still = paused || reduced;
  const motion={intensity:typeof settings.intensity==='number'?settings.intensity:1,speed:typeof settings.speed==='number'?settings.speed:1};
  return <div className={`demo demo-${id} ${still ? 'demo-still' : ''}`}>
    {id==='sacred-lotus'&&<SacredLotus {...settings} progress={settings.playback==='controlled'?Number(settings.progress??56):undefined} interactive={settings.interactive!=='disabled'} compact={!expanded} paused={!!still}/>}
    {id==='iris-turbine'&&<IrisTurbine {...settings} speed={settings.mode==='controlled'?Number(settings.speed??88):undefined} autoDemo={settings.mode!=='interactive'&&settings.mode!=='controlled'} interactive={settings.interactive!=='disabled'} showTelemetry={settings.showTelemetry==='enabled'} compact={!expanded} paused={!!still}/>}
    {id==='bokeh-terrain'&&<BokehTerrain {...settings} showStars={settings.showStars!=='disabled'} interactive={settings.interactive!=='disabled'} showTitle={settings.showTitle==='enabled'} compact={!expanded} paused={!!still}/>}
    {id==='opaline-orb'&&<OpalineOrb {...settings} colorPalette={{coreBlue:String(settings.coreBlue??'#8ab8f8'),warmPeach:String(settings.warmPeach??'#ffbe98'),outerLavender:String(settings.outerLavender??'#c4b5fd'),lineColor:String(settings.lineColor??'#ffffff')}} interactive={settings.interactive!=='disabled'} listening={settings.listening==='enabled'} compact={!expanded} paused={!!still}/>}
    {id==='orbit-agent'&&<OrbitAgent {...settings} agentMood={settings.agentMood as 'idle'|'happy'|'listening'|'sleepy'|undefined} interactive={settings.interactive!=='disabled'} compact={!expanded} paused={!!still}/>}
    {id==='water-ripple-carousel'&&<WaterRippleCarousel {...settings} compact={!expanded} paused={!!still}/>}
    {id==='aperture-carousel'&&<ApertureCarousel {...settings} compact={!expanded} paused={!!still}/>}
    {id==='thermal-smoke'&&<ThermalSmoke {...settings} autoTriggerIntro={settings.autoTriggerIntro!=='disabled'} compact={!expanded} paused={!!still}/>}
    {id==='radial-spectrum'&&<RadialSpectrum {...settings} autoDemo={autoDemo} preset={settings.preset as 'inception'|'interstellar'|undefined} compact={!expanded} paused={!!still}/>}
    {id==='type-garden'&&<TypeGarden {...settings} editable={expanded&&settings.editable!=='disabled'} palette={settings.palette as string|undefined} motionMode={settings.motionMode as 'breeze'|'grow'|'pulse'|'flutter'|undefined} showButterflies={settings.showButterflies!=='disabled'} showControls={expanded&&settings.showControls!=='disabled'} compact={!expanded} paused={!!still} onTextChange={onSettingsChange?defaultText=>onSettingsChange({defaultText}):undefined} onPaletteChange={onSettingsChange?palette=>onSettingsChange({palette}):undefined}/>}
    {id==='prism-button'&&<PrismPreview {...settings} compact={!expanded} paused={!!still} perspective={settings.perspective==='enabled'}/>}
    {id==='spectral-button'&&<SpectralPreview {...settings} compact={!expanded} paused={!!still} perspective={settings.perspective==='enabled'}/>}
    {id==='caustic-button'&&<CausticPreview {...settings} compact={!expanded} paused={!!still} perspective={settings.perspective==='enabled'}/>}
    {id==='lenticular-button'&&<LenticularPreview {...settings} compact={!expanded} paused={!!still} idleMotion={settings.idleMotion!=='disabled'}/>}
    {id==='photon-button'&&<PhotonPreview {...settings} compact={!expanded} paused={!!still}/>}
    {id==='optical-button'&&<OpticalPlayground {...settings} compact={!expanded} paused={!!still} perspective={settings.perspective==='enabled'}/>}
    {id==='quantum-core'&&<QuantumCore {...settings} compact={!expanded} paused={!!still} interactive={settings.interactive!=='disabled'}/>}
    {id==='clustered'&&<Clustered {...settings} compact={!expanded} paused={!!still} interactive={settings.interactive!=='disabled'} colorPalette={[String(settings.cobalt??'#082fff'),String(settings.blue??'#3b82f6'),String(settings.ice??'#bae6fd')]}/>}
    {id==='stratum'&&<Stratum compact={!expanded} paused={!!still} gridSize={settings.gridSize as number|undefined} maxHeight={settings.maxHeight as number|undefined} waveSpeed={settings.waveSpeed as number|undefined} sequenceMode={settings.sequenceMode as 'auto'|'perlin'|'radial'|'diagonal'|'step'|undefined} hoverEffect={settings.hoverEffect as 'retract'|'elevate'|undefined} colorPalette={{background:settings.background as string|undefined,pillars:settings.pillars as string|undefined,light:settings.light as string|undefined}}/>}
    {id==='inkshift'&&<Inkshift compact={!expanded} paused={!!still} words={typeof settings.words==='string'?settings.words.split(/\r?\n/):undefined} vorticity={settings.vorticity as number|undefined} dissipation={settings.dissipation as number|undefined} splatRadius={settings.splatRadius as number|undefined} threshold={settings.threshold as number|undefined} backgroundColor={settings.backgroundColor as string|undefined} foregroundColor={settings.foregroundColor as string|undefined} autoCycle={settings.autoCycle!=='disabled'}/>}
    {id==='atelier'&&<Atelier compact={!expanded} paused={!!still} renderImage={settings.renderImage as string|undefined} sketchImage={settings.sketchImage as string|undefined} portalSize={settings.portalSize as number|undefined} brushSize={settings.brushSize as number|undefined} trailFadeSpeed={settings.trailFadeSpeed as number|undefined} edgeRoughness={settings.edgeRoughness as number|undefined} title={settings.title as string|undefined} subtitle={settings.subtitle as string|undefined}/>}
    {id==='charge'&&<Charge compact={!expanded} paused={!!still} percentage={settings.percentage as number|undefined} statusText={settings.statusText as string|undefined} flowSpeed={settings.flowSpeed as number|undefined} particleCount={settings.particleCount as number|undefined} primaryColor={settings.primaryColor as string|undefined} secondaryColor={settings.secondaryColor as string|undefined} animateCount={settings.animateCount!=='disabled'}/>}
    {id==='resonance'&&<Resonance compact={!expanded} paused={!!still} size={settings.size as number|undefined} speed={settings.speed as number|undefined} waveAmplitude={settings.waveAmplitude as number|undefined} ribbonCount={settings.ribbonCount as number|undefined} intensity={settings.intensity as number|undefined} colorPalette={[typeof settings.blue==='string'?settings.blue:'#234bff',typeof settings.light==='string'?settings.light:'#5a8cff',typeof settings.aura==='string'?settings.aura:'#1a3cff']}/>}
    {id==='meridian'&&<Meridian autoPlay={settings.autoPlay!=='disabled'} scrollSensitivity={settings.scrollSensitivity as number|undefined} cinematicIntro={settings.cinematicIntro!=='disabled'} compact={!expanded} paused={!!still} animationSpeed={settings.animationSpeed as number|undefined} replay={settings.replay as number|undefined} primaryRouteColor={settings.primaryRouteColor as string|undefined} incidentColor={settings.incidentColor as string|undefined} detourGradient={[typeof settings.detour1==='string'?settings.detour1:'#00f0ff',typeof settings.detour2==='string'?settings.detour2:'#326aff',typeof settings.detour3==='string'?settings.detour3:'#8b3dff',typeof settings.detour4==='string'?settings.detour4:'#ff0055']}/>}
    {id==='sleeve'&&<Sleeve compact={!expanded} paused={!!still} tiltAngle={settings.tiltAngle as number|undefined} initialIndex={settings.initialIndex as number|undefined} springConfig={{stiffness:typeof settings.stiffness==='number'?settings.stiffness:140,damping:typeof settings.damping==='number'?settings.damping:22}}/>}
    {id==='deck'&&<Deck compact={!expanded} paused={!!still} springSpeed={settings.springSpeed as number|undefined} speed={settings.speed as number|undefined} elevation={settings.elevation as number|undefined} autoPlay={settings.autoPlay!=='disabled'} colors={[typeof settings.green==='string'?settings.green:'#bdde83',typeof settings.cyan==='string'?settings.cyan:'#5ee7d3',typeof settings.violet==='string'?settings.violet:'#a791f4',typeof settings.gold==='string'?settings.gold:'#e6ce84']}/>}
    {id==='sentiment'&&<Sentiment compact={!expanded} paused={!!still} asset={settings.asset as SentimentProps['asset']} range={settings.range as SentimentProps['range']} amplitude={settings.amplitude as number|undefined} speed={settings.speed as number|undefined} strokeWidth={settings.strokeWidth as number|undefined} fillOpacity={settings.fillOpacity as number|undefined} onRangeChange={onSettingsChange?range=>onSettingsChange({range}):undefined}/>}
    {id==='companion'&&<Companion {...motion} compact={!expanded} paused={!!still} eyeResponse={settings.eyeResponse as number|undefined} warmColor={settings.warmColor as string|undefined} coolColor={settings.coolColor as string|undefined}/>}
    {id==='helix'&&<Helix compact={!expanded} paused={!!still} particleCount={settings.particleCount as number|undefined} rotationSpeed={settings.rotationSpeed as number|undefined} dispersionStrength={settings.dispersionStrength as number|undefined} interactive={settings.interactive!=='disabled'} colors={[typeof settings.violet==='string'?settings.violet:'#7c3aed',typeof settings.magenta==='string'?settings.magenta:'#ec4899',typeof settings.cyan==='string'?settings.cyan:'#06b6d4']}/>}
    {id==='holdings'&&<Holdings compact={!expanded} paused={!!still} target={settings.target as number|undefined} scale={settings.scale as number|undefined} speed={settings.speed as number|undefined} thickness={settings.thickness as number|undefined} gap={settings.gap as number|undefined} activity={settings.activity as number|undefined}/>}
    {id==='galaxy'&&<Galaxy compact={!expanded} paused={!!still} count={settings.count as number|undefined} speed={settings.speed as number|undefined} arms={settings.arms as number|undefined} tilt={settings.tilt as number|undefined} glow={settings.glow as number|undefined} coreColor={settings.coreColor as string|undefined} edgeColor={settings.edgeColor as string|undefined}/>}
    {id==='luma'&&<Luma compact={!expanded} paused={!!still} count={settings.count as number|undefined} speed={settings.speed as number|undefined} amplitude={settings.amplitude as number|undefined} glow={settings.glow as number|undefined} warmColor={settings.warmColor as string|undefined} coolColor={settings.coolColor as string|undefined}/>}
    {id==='aura'&&<Aura {...motion} compact={!expanded} paused={!!still} score={settings.score as number|undefined} waves={settings.waves as number|undefined} density={settings.density as number|undefined} onScoreChange={onSettingsChange?score=>onSettingsChange({score}):undefined}/>}
    {id==='nexus'&&<Nexus {...motion} compact={!expanded} paused={!!still} nodes={settings.nodes as number|undefined} connections={settings.connections as number|undefined} strokeWidth={settings.strokeWidth as number|undefined}/>}
    {id==='orbit'&&<Orbit {...motion} compact={!expanded} paused={!!still} rings={settings.rings as number|undefined} strokeWidth={settings.strokeWidth as number|undefined} spread={settings.spread as number|undefined}/>}
    {id==='halo'&&<Halo {...motion} compact={!expanded} paused={!!still} count={settings.count as number|undefined} dotSize={settings.dotSize as number|undefined}/>}
    {id==='constellation'&&<Constellation {...motion} compact={!expanded} paused={!!still} nodes={settings.nodes as number|undefined} density={settings.density as number|undefined} accent={settings.accent as string|undefined}/>}
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
