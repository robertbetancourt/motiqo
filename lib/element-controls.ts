import type { ElementId, LibraryElement } from './catalog';
export type Settings=Record<string,string|number>;
export type Control={key:string;label:string;kind:'range'|'select'|'color';defaultValue:string|number;min?:number;max?:number;step?:number;choices?:{value:string;label:string}[]};
import * as registry from '../registry/manifest.json';
export function controlsFor(id:ElementId):Control[]{return (registry.items.find(item=>item.id===id)?.controls??[]) as Control[];}
export const defaultsFor=(id:ElementId):Settings=>Object.fromEntries(controlsFor(id).map(control=>[control.key,control.defaultValue]));
export const moodsFor=(id:ElementId)=>registry.items.find(item=>item.id===id)?.moods??[];

/** Only declared, bounded props can cross the URL/storage boundary. */
export function normalizeSettings(id:ElementId,input:unknown):Settings {
  const result=defaultsFor(id);
  if(!input||typeof input!=='object'||Array.isArray(input))return result;
  const values=input as Record<string,unknown>;
  for(const control of controlsFor(id)){
    if(!Object.hasOwn(values,control.key))continue;
    const value=values[control.key];
    if(control.kind==='range'&&typeof value==='number'&&Number.isFinite(value)){
      const min=control.min!,max=control.max!,step=control.step??1;
      result[control.key]=Number(Math.min(max,Math.max(min,min+Math.round((Math.min(max,Math.max(min,value))-min)/step)*step)).toFixed(6));
    }else if(control.kind==='select'&&control.choices?.some(choice=>choice.value===value))result[control.key]=value as string;
    else if(control.kind==='color'&&typeof value==='string'&&/^#[\da-f]{6}$/i.test(value))result[control.key]=value.toLowerCase();
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
  const name=element.id==='event-horizon'?'EventHorizon':element.id==='liquid-relic'?'LiquidRelic':element.id==='liquid-sculpture'?'LiquidForm':element.id==='glow-nav'?'GlowNav':element.id==='gilded-signal'?'GildedCard':element.id==='silk-aperture'?'SilkAperture':element.title;
  const filename=element.id==='liquid-sculpture'?'liquid-form':element.id==='gilded-signal'?'gilded-card':element.id;
  const props=Object.entries(settings).map(([key,value])=>`${key}=${typeof value==='number'?`{${value}}`:JSON.stringify(value)}`).join(' ');
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
  if(element.id==='galaxy'||element.id==='holdings'||element.id==='companion'||element.id==='sentiment'||element.id==='constellation')return `import ${name} from './${filename}';\n\nexport default function Example() {\n  return <div style={{ height: 520 }}><${name} ${props} /></div>;\n}`;
  if(element.id==='aura'){
    const rest=Object.entries(settings).filter(([key])=>key!=='score').map(([key,value])=>`${key}=${typeof value==='number'?`{${value}}`:JSON.stringify(value)}`).join(' ');
    return `import { useState } from 'react';\nimport Aura from './aura';\n\nexport default function Example() {\n  const [score, setScore] = useState(${typeof settings.score==='number'?settings.score:4.12});\n  return <Aura score={score} onScoreChange={setScore} ${rest} />;\n}`;
  }
  return `import ${name} from './${filename}';\n\nexport default function Example() {\n  return <${name} ${props} />;\n}`;
}
