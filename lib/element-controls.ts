import type { ElementId, LibraryElement } from './catalog';
export type Settings=Record<string,string|number>;
export type Control={key:string;label:string;kind:'range'|'select'|'color';defaultValue:string|number;min?:number;max?:number;step?:number;choices?:{value:string;label:string}[]};
const motion:Control[]=[{key:'intensity',label:'Response',kind:'range',defaultValue:1,min:0,max:1.4,step:.05},{key:'speed',label:'Speed',kind:'range',defaultValue:1,min:.4,max:1.8,step:.05}];
export function controlsFor(id:ElementId):Control[]{
  if(id==='halo')return [...motion,{key:'count',label:'Particles',kind:'range',defaultValue:480,min:160,max:900,step:20},{key:'dotSize',label:'Dot size',kind:'range',defaultValue:1,min:.5,max:2,step:.05}];
  if(id==='liquid-relic'||id==='event-horizon')return [
    {key:'restStyle',label:'Resting finish',kind:'select',defaultValue:'image',choices:[{value:'image',label:'Solid image'},{value:'particles',label:'Particles'}]},
    {key:'strength',label:'Response',kind:'range',defaultValue:1,min:0,max:2,step:.05},
    {key:'radius',label:'Brush radius',kind:'range',defaultValue:220,min:80,max:400,step:5},
    {key:'particleSpread',label:'Dispersion',kind:'range',defaultValue:1,min:0,max:2,step:.05},
    {key:'liquid',label:'Fluidity',kind:'range',defaultValue:1,min:0,max:2,step:.05},
    {key:'returnSpeed',label:'Return',kind:'range',defaultValue:1,min:.2,max:2,step:.05},
    {key:'sculptureScale',label:'Scale',kind:'range',defaultValue:1,min:.6,max:1.2,step:.05},
  ];
  if(id==='pulse')return [{key:'speed',label:'Tempo',kind:'range',defaultValue:1,min:.4,max:1.8,step:.05},{key:'amplitude',label:'Amplitude',kind:'range',defaultValue:1,min:.4,max:1.4,step:.05},{key:'accent',label:'Line colour',kind:'color',defaultValue:'#cdd6cc'}];
  if(id==='liquid-sculpture')return [
    {key:'shape',label:'Form',kind:'select',defaultValue:'knot',choices:[{value:'knot',label:'Knot'},{value:'orbit',label:'Orbit'},{value:'bloom',label:'Bloom'}]},
    {key:'liquidity',label:'Liquidity',kind:'range',defaultValue:.8,min:0,max:1.5,step:.05},
    {key:'relief',label:'Relief',kind:'range',defaultValue:.35,min:0,max:1,step:.05},
    {key:'scale',label:'Scale',kind:'range',defaultValue:1,min:.6,max:1.3,step:.05},
    {key:'tint',label:'Metal tint',kind:'color',defaultValue:'#bdcaba'},
  ];
  if(id==='glow-nav')return [{key:'duration',label:'Transition',kind:'range',defaultValue:.65,min:.2,max:1.5,step:.05},{key:'accent',label:'Light colour',kind:'color',defaultValue:'#ef6052'}];
  if(id==='silk-aperture')return [{key:'light',label:'Light',kind:'select',defaultValue:'dusk',choices:[{value:'dawn',label:'Dawn'},{value:'dusk',label:'Dusk'}]}];
  if(id==='gilded-signal')return [{key:'backgroundSrc',label:'Artwork',kind:'select',defaultValue:'/media/atmosphere.webp',choices:[{value:'/media/atmosphere.webp',label:'Botanical'},{value:'/media/tiger.webp',label:'Tiger'}]}];
  return id==='crate'?[{key:'count',label:'Records',kind:'range',defaultValue:8,min:3,max:10,step:1},...motion]:motion;
}
export const defaultsFor=(id:ElementId):Settings=>Object.fromEntries(controlsFor(id).map(control=>[control.key,control.defaultValue]));
export function usageFor(element:LibraryElement,settings?:Settings){
  if(!settings||!Object.keys(settings).length)return element.code;
  const name=element.id==='event-horizon'?'EventHorizon':element.id==='liquid-relic'?'LiquidRelic':element.id==='liquid-sculpture'?'LiquidForm':element.id==='glow-nav'?'GlowNav':element.id==='gilded-signal'?'GildedCard':element.id==='silk-aperture'?'SilkAperture':element.title;
  const filename=element.id==='liquid-sculpture'?'liquid-form':element.id==='gilded-signal'?'gilded-card':element.id;
  const props=Object.entries(settings).map(([key,value])=>`${key}=${typeof value==='number'?`{${value}}`:JSON.stringify(value)}`).join(' ');
  return `import ${name} from './${filename}';\n\nexport default function Example() {\n  return <${name} ${props} />;\n}`;
}
