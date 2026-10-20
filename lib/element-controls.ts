import type { ElementId, LibraryElement } from './catalog';
export type Settings=Record<string,string|number>;
export type Control={key:string;label:string;kind:'range'|'select'|'color'|'text';hidden?:boolean;defaultValue:string|number;min?:number;max?:number;step?:number;maxLength?:number;multiline?:boolean;choices?:{value:string;label:string}[]};
import * as registry from '../registry/manifest.json';
export function controlsFor(id:ElementId):Control[]{return (registry.items.find(item=>item.id===id)?.controls??[]) as Control[];}
export const defaultsFor=(id:ElementId):Settings=>Object.fromEntries(controlsFor(id).map(control=>[control.key,control.defaultValue]));
export const moodsFor=(id:ElementId):{id:string;label:string;settings:Settings}[]=>
  (registry.items.find(item=>item.id===id)?.moods??[]) as {id:string;label:string;settings:Settings}[];

/** Only declared, bounded props can cross the URL/storage boundary. */
export function normalizeSettings(id:ElementId,input:unknown):Settings {
  const result=defaultsFor(id);
  if(!input||typeof input!=='object'||Array.isArray(input))return result;
  const values=input as Record<string,unknown>;
  for(const control of controlsFor(id)){
    if(!Object.hasOwn(values,control.key))continue;
    const value=id==='gilded-signal'&&control.key==='backgroundSrc'&&values[control.key]==='/media/tiger.webp'?'/media/starlit-cat.webp':values[control.key];
    if(control.kind==='range'&&typeof value==='number'&&Number.isFinite(value)){
      const min=control.min!,max=control.max!,step=control.step??1;
      result[control.key]=Number(Math.min(max,Math.max(min,min+Math.round((Math.min(max,Math.max(min,value))-min)/step)*step)).toFixed(6));
    }else if(control.kind==='select'&&control.choices?.some(choice=>choice.value===value))result[control.key]=value as string;
    else if(control.kind==='color'&&typeof value==='string'&&/^#[\da-f]{6}$/i.test(value))result[control.key]=value.toLowerCase();
    else if(control.kind==='text'&&typeof value==='string')result[control.key]=value.replace(/\u0000/g,'').slice(0,Math.min(1024,control.maxLength??200));
  }
  if(id==='stratum'&&result.background==='#7e92d4'&&result.pillars==='#a6baf7'&&result.light==='#eff5ff'){const defaults=defaultsFor(id);result.background=defaults.background;result.pillars=defaults.pillars;result.light=defaults.light;}
  // Refresh the former reference copy in saved/shared defaults, preserving custom copy.
  if(id==='inkshift'&&['ui**xNin**ja\npr**odu**ct\nd**esi**gn\nsy**stem**s\nen**gineer**ing','mo**ti**qo\nsmall **details**\nin **motion**'].includes(String(result.words)))result.words=defaultsFor(id).words;
  if(id==='sonic-aperture'&&result.lyrics==="My broken\npieces, you\npick them up\n\nDon't leave\nme hanging\nHanging come\ngive me some")result.lyrics=defaultsFor(id).lyrics;
  if(id==='sonic-aperture'&&result.lyrics==='Come be\nthe man\nI need')result.lyrics=defaultsFor(id).lyrics;
  if(id==='atelier'&&result.title==='Designing the feeling of a room.')result.title=defaultsFor(id).title;
  if(id==='sacred-lotus'&&result.statusText==='Generating...')result.statusText='Loading...';
  if(id==='elevation-matrix'&&result.unitLabel==='contribuciones')result.unitLabel='contributions';
  // The previous image brush used pixel units; retain only its meaningful settings.
  if(id==='event-horizon'&&input&&typeof input==='object'&&Number((input as Settings).radius)>10){result.radius=defaultsFor(id).radius;}
  if(id==='thermal-smoke'&&result.city==='Stockholm')result.city='Buenos Aires';
  if(id==='thermal-smoke'&&result.warmColor==='#ff2e4c'&&result.coldColor==='#06b6d4'){
    result.warmColor=defaultsFor(id).warmColor;result.coldColor=defaultsFor(id).coldColor;
  }
  return result;
}
export function decodeSettings(id:ElementId,raw:string|null):Settings|null {
  if(!raw||raw.length>4096)return null;
  try{const parsed=JSON.parse(raw);return parsed?.v===1&&parsed.id===id&&parsed.settings&&typeof parsed.settings==='object'&&!Array.isArray(parsed.settings)?normalizeSettings(id,parsed.settings):null;}catch{return null;}
}
export const encodeSettings=(id:ElementId,settings:Settings)=>JSON.stringify({v:1,id,settings:normalizeSettings(id,settings)});
export function configurationUrl(href:string,id:ElementId,settings:Settings){
  const url=new URL(href);url.hash='';url.searchParams.set('element',id);url.searchParams.set('config',encodeSettings(id,settings));return url;
}
export function usageFor(element:LibraryElement,settings?:Settings){
  if(!settings||!Object.keys(settings).length)return element.code;
  const name=element.id==='sonic-aperture'?'SonicAperture':element.id==='prism-core'?'PrismCore':element.id==='aperture-loader'?'ApertureLoader':element.id==='event-horizon'?'PrismBloom':element.id==='liquid-artifact-hero'?'LiquidArtifact':element.id==='liquid-sculpture'?'LiquidForm':element.id==='glow-nav'?'GlowNav':element.id==='gilded-signal'?'GildedCard':element.id==='silk-aperture'?'SilkAperture':element.title;
  if(element.id==='elastic-showcase'){
    const configured=Object.entries(normalizeSettings(element.id,settings)).map(([key,value])=>key+'={'+(key==='autoPlay'?String(value!=='disabled'):JSON.stringify(value))+'}').join(' ');
    return `import ElasticShowcase from './elastic-showcase';\n\nexport default function Example(){return <div style={{height:620}}><ElasticShowcase ${configured}/></div>;}`;
  }
  if(['sonic-aperture','prism-core','aperture-loader'].includes(element.id)){
    const configured=Object.entries(settings).map(([key,value])=>key+'={'+(key==='lyrics'?JSON.stringify(String(value).split(/\n\s*\n/).map(v=>v.split('\n'))):['interactive','autoPlay'].includes(key)?String(value!=='disabled'):key==='defaultListening'?String(value==='open'):JSON.stringify(value))+'}').join(' ');
    return `import ${name} from './${element.id}';\n\nexport default function Example(){return <div style={{height:560}}><${name} ${configured}/></div>;}`;
  }
  if(element.id==='liquid-artifact-hero'){
    const configured=Object.entries(normalizeSettings(element.id,settings)).map(([key,value])=>key+'={'+(key==='defaultShape'?Number(value):JSON.stringify(value))+'}').join(' ');
    return `import LiquidArtifact from './liquid-artifact';\n\nexport default function Example() {\n  return <div style={{ height: 720 }}><LiquidArtifact ${configured} /></div>;\n}`;
  }
  const filename=element.id==='event-horizon'?'prism-bloom':element.id==='liquid-sculpture'?'liquid-form':element.id==='gilded-signal'?'gilded-card':element.id;
  const props=Object.entries(settings).map(([key,value])=>`${key}=${typeof value==='number'?`{${value}}`:JSON.stringify(value)}`).join(' ');
  if(['sacred-lotus','iris-turbine','bokeh-terrain','opaline-orb','orbit-agent'].includes(element.id)){
    const flags=['interactive','showStars','showTitle','showTelemetry','listening'];
    const skip=element.id==='sacred-lotus'?['playback',...(settings.playback==='controlled'?[]:['progress'])]:element.id==='iris-turbine'?['mode',...(settings.mode==='controlled'?[]:['speed'])]:element.id==='opaline-orb'?['coreBlue','warmPeach','outerLavender','lineColor']:[];
    let configured=Object.entries(settings).filter(([key])=>!skip.includes(key)).map(([key,value])=>key+'='+(flags.includes(key)?'{'+(value==='enabled')+'}':typeof value==='number'?'{'+value+'}':JSON.stringify(value))).join(' ');
    if(element.id==='iris-turbine')configured+=' autoDemo={'+(settings.mode==='demo')+'}';
    if(element.id==='opaline-orb')configured+=' colorPalette={'+JSON.stringify({coreBlue:settings.coreBlue??'#8ab8f8',warmPeach:settings.warmPeach??'#ffbe98',outerLavender:settings.outerLavender??'#c4b5fd',lineColor:settings.lineColor??'#ffffff'})+'}';
    return `import ${name} from './${filename}';\n\nexport default function Example() {\n  return <div style={{ height: 620 }}><${name} ${configured} /></div>;\n}`;
  }
  if(['water-ripple-carousel','aperture-carousel','thermal-smoke','vapor-ring','radial-spectrum','type-garden'].includes(element.id)){
    const flags=['autoTriggerIntro','editable','showButterflies','showControls'];
    const configured=Object.entries(settings).map(([key,value])=>key+'='+(flags.includes(key)?'{'+(value!=='disabled')+'}':typeof value==='number'?'{'+value+'}':JSON.stringify(value))).join(' ');
    return `import ${name} from './${filename}';\n\nexport default function Example() {\n  return <div style={{ height: 620 }}><${name} ${configured} /></div>;\n}`;
  }
  if(element.id==='prism-button'){const opticalProps=Object.entries(settings).filter(([key])=>key!=='perspective').map(([key,value])=>key+'={'+value+'}').join(' ');return "import PrismPreview, { PrismButton } from './prism-button';\n\nexport default function Example() {\n  return <div style={{ height: 700 }}><PrismPreview "+opticalProps+" perspective={"+(settings.perspective==='enabled')+"} /></div>;\n}\n\n// Independently: <PrismButton>Prism Button</PrismButton>";}
  if(element.id==='spectral-button'||element.id==='caustic-button'){
    const name=element.id==='spectral-button'?'Spectral':'Caustic';
    const opticalProps=Object.entries(settings).filter(([key])=>key!=='perspective').map(([key,value])=>key+'={'+value+'}').join(' ');
    return `import ${name}Preview, { ${name}Button } from './${element.id}';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><${name}Preview ${opticalProps} perspective={${settings.perspective==='enabled'}} /></div>;\n}\n\n// Standalone: <${name}Button>${name} Button</${name}Button>`;
  }
  if(element.id==='lenticular-button'||element.id==='photon-button'){
    const name=element.id==='lenticular-button'?'Lenticular':'Photon';
    const props=Object.entries(settings).map(([key,value])=>key+'='+(key==='idleMotion'?'{'+(value!=='disabled')+'}':typeof value==='number'?'{'+value+'}':JSON.stringify(value))).join(' ');
    return `import ${name}Preview, { ${name}Button } from './${element.id}';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><${name}Preview ${props} /></div>;\n}\n\n// Standalone: <${name}Button />`;
  }
  if(element.id==='optical-button'){const opticalProps=Object.entries(settings).filter(([key])=>key!=='perspective').map(([key,value])=>key+'={'+value+'}').join(' ');return "import OpticalPlayground, { OpticalButton } from './optical-button';\n\nexport default function Example() {\n  return <div style={{ height: 700 }}><OpticalPlayground "+opticalProps+" perspective={"+(settings.perspective==='enabled')+"} /></div>;\n}\n\n// Independently: <OpticalButton>Optical Button</OpticalButton>";}
  if(element.id==='quantum-core'){const p=Object.entries(settings).filter(([key])=>key!=='interactive').map(([key,value])=>key+'='+ (typeof value==='number'?'{'+value+'}':JSON.stringify(value))).join(' ');return "import QuantumCore from './quantum-core';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><QuantumCore "+p+" interactive={"+(settings.interactive!=='disabled')+"} /></div>;\n}";}
  if(element.id==='clustered'){const colors=JSON.stringify([settings.cobalt??'#082fff',settings.blue??'#3b82f6',settings.ice??'#bae6fd']);return "import Clustered from './clustered';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><Clustered strandCount={"+(settings.strandCount??64)+"} clusterCount={"+(settings.clusterCount??6)+"} fallSpeed={"+(settings.fallSpeed??1)+"} pulseFrequency={"+(settings.pulseFrequency??1)+"} glowIntensity={"+(settings.glowIntensity??1)+"} motionIntensity={"+(settings.motionIntensity??1)+"} colorPalette={"+colors+"} interactive={"+(settings.interactive!=='disabled')+"} /></div>;\n}";}
  if(element.id==='stratum')return `import Stratum from './stratum';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><Stratum gridSize={${settings.gridSize??24}} maxHeight={${settings.maxHeight??4.5}} waveSpeed={${settings.waveSpeed??1}} sequenceMode=${JSON.stringify(settings.sequenceMode??'auto')} hoverEffect=${JSON.stringify(settings.hoverEffect??'retract')} colorPalette={${JSON.stringify({background:settings.background??'#101114',pillars:settings.pillars??'#9ca3af',light:settings.light??'#eef0f4'})}} /></div>;\n}`;
  if(element.id==='inkshift'){
    const words=String(settings.words??'Mo**ti**qo\nD**esi**gn\nM**oti**on\nCr**eati**ve').split(/\r?\n/).filter(Boolean);
    return `import Inkshift from './inkshift';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><Inkshift words={${JSON.stringify(words)}} vorticity={${settings.vorticity??40}} dissipation={${settings.dissipation??.55}} splatRadius={${settings.splatRadius??.12}} threshold={${settings.threshold??.5}} backgroundColor=${JSON.stringify(settings.backgroundColor??'#0b0c10')} foregroundColor=${JSON.stringify(settings.foregroundColor??'#f3f2ed')} autoCycle={${settings.autoCycle!=='disabled'}} /></div>;\n}`;
  }
  if(element.id==='atelier')return `import Atelier from './atelier';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><Atelier ${props} /></div>;\n}`;
  if(element.id==='charge')return `import Charge from './charge';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><Charge percentage={${settings.percentage??46}} statusText=${JSON.stringify(settings.statusText??'Quick Charge')} flowSpeed={${settings.flowSpeed??1}} particleCount={${settings.particleCount??240}} primaryColor=${JSON.stringify(settings.primaryColor??'#00e5ff')} secondaryColor=${JSON.stringify(settings.secondaryColor??'#ffb52e')} animateCount={${settings.animateCount!=='disabled'}} /></div>;\n}`;
  if(element.id==='resonance')return `import Resonance from './resonance';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><Resonance size={${settings.size??300}} speed={${settings.speed??1}} waveAmplitude={${settings.waveAmplitude??1}} ribbonCount={${settings.ribbonCount??38}} intensity={${settings.intensity??1}} colorPalette={${JSON.stringify([settings.blue??'#234bff',settings.light??'#5a8cff',settings.aura??'#1a3cff'])}} /></div>;\n}`;
  if(element.id==='meridian'){
    const gradient=JSON.stringify([settings.detour1??'#00f0ff',settings.detour2??'#326aff',settings.detour3??'#8b3dff',settings.detour4??'#ff0055']);
    return `import Meridian from './meridian';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><Meridian autoPlay={${settings.autoPlay!=='disabled'}} scrollSensitivity={${settings.scrollSensitivity??1}} cinematicIntro={${settings.cinematicIntro!=='disabled'}} primaryRouteColor=${JSON.stringify(settings.primaryRouteColor??'#00f0ff')} incidentColor=${JSON.stringify(settings.incidentColor??'#ff0055')} animationSpeed={${settings.animationSpeed??1}} replay={${settings.replay??0}} detourGradient={${gradient}} /></div>;\n}`;
  }
  if(element.id==='sleeve')return `import Sleeve from './sleeve';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><Sleeve tiltAngle={${settings.tiltAngle??-28}} initialIndex={${settings.initialIndex??0}} springConfig={{ stiffness: ${settings.stiffness??140}, damping: ${settings.damping??22} }} /></div>;\n}`;
  if(element.id==='deck'){
    const parameters=['springSpeed','speed','elevation'].filter(key=>typeof settings[key]==='number').map(key=>`${key}={${settings[key]}}`).join(' '),colors=JSON.stringify([settings.green??'#bdde83',settings.cyan??'#5ee7d3',settings.violet??'#a791f4',settings.gold??'#e6ce84']);
    return `import Deck from './deck';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><Deck ${parameters} colors={${colors}} autoPlay={${settings.autoPlay!=='disabled'}} /></div>;\n}`;
  }
  if(element.id==='helix'){
    const parameters=Object.entries(settings).filter(([key])=>!['violet','magenta','cyan','interactive'].includes(key)).map(([key,value])=>`${key}={${value}}`).join(' '),colors=JSON.stringify([settings.violet??'#7c3aed',settings.magenta??'#ec4899',settings.cyan??'#06b6d4']);
    return `import Helix from './helix';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><Helix ${parameters} colors={${colors}} interactive={${settings.interactive!=='disabled'}} /></div>;\n}`;
  }
  if(element.id==='meridian-veil'){
    const theme=JSON.stringify(settings.theme??'mint');
    const parameters=['meridianCount','pointsPerMeridian','waveAmplitude','speed'].filter(key=>typeof settings[key]==='number').map(key=>`${key}={${settings[key]}}`).join(' ');
    const interactive=settings.interactive!=='disabled';
    const showThemeSwitcher=settings.showThemeSwitcher!=='hide';
    return `import MeridianVeil from './meridian-veil';\n\nexport default function Example() {\n  return <div style={{ height: 560 }}><MeridianVeil theme=${theme}${parameters?' '+parameters:''} interactive={${interactive}} showThemeSwitcher={${showThemeSwitcher}} /></div>;\n}`;
  }
  if(element.id==='galaxy'||element.id==='holdings'||element.id==='companion'||element.id==='sentiment'||element.id==='constellation')return `import ${name} from './${filename}';\n\nexport default function Example() {\n  return <div style={{ height: 520 }}><${name} ${props} /></div>;\n}`;
  if(element.id==='aura'){
    const rest=Object.entries(settings).filter(([key])=>key!=='score').map(([key,value])=>`${key}=${typeof value==='number'?`{${value}}`:JSON.stringify(value)}`).join(' ');
    return `import { useState } from 'react';\nimport Aura from './aura';\n\nexport default function Example() {\n  const [score, setScore] = useState(${typeof settings.score==='number'?settings.score:4.12});\n  return <Aura score={score} onScoreChange={setScore} ${rest} />;\n}`;
  }
  return `import ${name} from './${filename}';\n\nexport default function Example() {\n  return <${name} ${props} />;\n}`;
}
