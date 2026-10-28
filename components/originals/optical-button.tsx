'use client';
import {useEffect,useRef,useState,type ButtonHTMLAttributes,type ReactNode,type CSSProperties} from 'react';
import {createNativeGL} from './native-gl';
import {effectRuntime} from './effect-runtime';
import {opticalFragment} from './optical-shaders';

export const opticalDefaults={refraction:56,thickness:32,bevelWidth:16,frost:28,dispersion:96,lightSheen:16,lightAngle:24,darkness:12,edgeRim:16,brightness:40,waveSpeed:80,waveScale:88,auraWidth:10,centerClarity:90,borderBeam:96,hoverGlow:180,cursorFlow:100,clickRipple:100};
export type OpticalSettings=typeof opticalDefaults;
type NumericKey=keyof OpticalSettings;
export const opticalGroups:{title:string;subtitle:string;controls:[NumericKey,string,number,number,string?][]}[]=[
 {title:'Glass Optics',subtitle:'Tactile Button',controls:[['refraction','Refraction',0,100],['thickness','Thickness',0,64],['bevelWidth','Bevel width',1,30],['frost','Frost',0,100],['dispersion','Dispersion',0,100],['lightSheen','Light sheen',0,100],['lightAngle','Light angle',0,360,'°'],['darkness','Darkness',0,100],['edgeRim','Edge rim',0,50]]},
 {title:'Fluid Settings',subtitle:'Liquid Caustic',controls:[['brightness','Brightness',0,100],['waveSpeed','Wave speed',0,200,'%'],['waveScale','Wave scale',10,200,'%'],['auraWidth','Aura width',1,40,'px'],['centerClarity','Center clarity',0,100,'%'],['borderBeam','Border beam',0,100,'%']]},
 {title:'Interactivity',subtitle:'Fluid Dynamics',controls:[['hoverGlow','Hover glow',0,300],['cursorFlow','Cursor flow',0,200,'%'],['clickRipple','Click ripple',0,200,'%']]},
];
const opticalBounds=Object.fromEntries(opticalGroups.flatMap(group=>group.controls).map(control=>[control[0],control]));
export type OpticalTiming={timeOffset?:number;timeScale?:number;hueOffset?:number};
export type OpticalButtonProps=Partial<OpticalSettings>&OpticalTiming&ButtonHTMLAttributes<HTMLButtonElement>&{iconOnly?:boolean;paused?:boolean;compact?:boolean;fragmentShader?:string;extraUniforms?:Record<string,number|readonly number[]>};

/** All visible button geometry and optical color come from WebGL2, not CSS. */
export function OpticalButton({iconOnly=false,paused=false,compact=false,fragmentShader=opticalFragment,extraUniforms={},timeOffset=0,timeScale=1,hueOffset=0,children,onClick,style,className='',...props}:OpticalButtonProps){
 const host=useRef<HTMLButtonElement>(null),canvas=useRef<HTMLCanvasElement>(null),wake=useRef<()=>void>(()=>{}),input=useRef({x:0,y:0,hover:0,clickX:0,clickY:0,click:0}),[generation,restart]=useState(0),[failed,setFailed]=useState(false);
 const settings=useRef({...opticalDefaults,...props,paused});settings.current={...opticalDefaults,...props,paused};
 const rendering=useRef({extraUniforms,timeOffset,timeScale,hueOffset});rendering.current={extraUniforms,timeOffset,timeScale,hueOffset};
 const nativeProps=Object.fromEntries(Object.entries(props).filter(([key])=>!(key in opticalDefaults))) as ButtonHTMLAttributes<HTMLButtonElement>;
 useEffect(()=>{
  const root=host.current!,surface=canvas.current!;let renderer:ReturnType<typeof createNativeGL>|undefined,clock:ReturnType<typeof effectRuntime>|undefined;
  let x=0,y=0,vx=0,vy=0,hover=0,ripple=100,clickVersion=0;
  setFailed(false);delete root.dataset.ready;
  try{
   renderer=createNativeGL(surface,true);const pass=renderer.pass(fragmentShader);
   clock=effectRuntime(root,surface,(time,dt)=>{
    const p=settings.current,target=input.current;
    const step=dt||0;vx+=(target.x-x)*190*step;vy+=(target.y-y)*190*step;vx*=Math.exp(-23*step);vy*=Math.exp(-23*step);x+=vx*step;y+=vy*step;hover+=(target.hover-hover)*(1-Math.exp(-12*step));
    if(target.click!==clickVersion){clickVersion=target.click;ripple=0;}else ripple+=dt;
    const parameters=rendering.current;
    const uniforms:Record<string,number|readonly number[]>={...parameters.extraUniforms,uResolution:[root.clientWidth+40,root.clientHeight+40],uSize:[root.clientWidth-12,root.clientHeight-12],uTime:time*parameters.timeScale+parameters.timeOffset,uHueOffset:parameters.hueOffset,uCursor:[x,y],uVelocity:[vx,vy],uHover:hover,uClick:[target.clickX,target.clickY],uRippleAge:ripple};
    for(const key of Object.keys(opticalDefaults) as NumericKey[]){const def=opticalBounds[key];const value=p[key];uniforms['u'+key[0].toUpperCase()+key.slice(1)]=Math.min(def[3],Math.max(def[2],Number.isFinite(value)?value:opticalDefaults[key]));}
    renderer!.draw(pass,null,uniforms);
   },()=>settings.current.paused,(w,h,dpr)=>{surface.width=Math.round((w+40)*dpr);surface.height=Math.round((h+40)*dpr);},compact);wake.current=clock.invalidate;
  }catch(error){console.error('OpticalButton:',error);setFailed(true);root.dataset.failed='true';renderer?.dispose();}
  function lost(event:Event){event.preventDefault();clock?.dispose();setFailed(true);delete root.dataset.ready;}
  function restored(){delete root.dataset.failed;restart(n=>n+1);}
  surface.addEventListener('webglcontextlost',lost);surface.addEventListener('webglcontextrestored',restored);
  return()=>{clock?.dispose();renderer?.dispose();wake.current=()=>{};surface.removeEventListener('webglcontextlost',lost);surface.removeEventListener('webglcontextrestored',restored);};
 },[compact,generation,fragmentShader]);
 useEffect(()=>wake.current());
 function position(e:{clientX:number;clientY:number}){const r=host.current!.getBoundingClientRect();input.current.x=((e.clientX-r.left)/r.width-.5)*host.current!.clientWidth;input.current.y=(.5-(e.clientY-r.top)/r.height)*host.current!.clientHeight;wake.current();}
 return <button {...nativeProps} ref={host} type={nativeProps.type||'button'} className={`mq-optical-button ${iconOnly?'mq-optical-icon':''} ${className}`} style={{...style}} aria-label={iconOnly?(nativeProps['aria-label']||'Optical activity'):nativeProps['aria-label']}
  onPointerMove={e=>{position(e);props.onPointerMove?.(e);}} onPointerEnter={e=>{input.current.hover=1;position(e);props.onPointerEnter?.(e);}} onPointerLeave={e=>{input.current.hover=0;wake.current();props.onPointerLeave?.(e);}}
  onFocus={e=>{input.current.hover=1;wake.current();props.onFocus?.(e);}} onBlur={e=>{input.current.hover=0;wake.current();props.onBlur?.(e);}}
  onClick={e=>{if(e.detail)position(e);else{input.current.x=0;input.current.y=0;}input.current.clickX=input.current.x;input.current.clickY=input.current.y;input.current.click++;wake.current();onClick?.(e);}}>
  <style>{buttonStyles}</style><canvas ref={canvas} aria-hidden="true"/>
  <span className="mq-optical-label">{children??(iconOnly?<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3v9h9A9 9 0 1 1 12 3Z"/><path d="M16 2.8a8 8 0 0 1 5.2 5.2H16Z"/></svg>:'Optical Button')}</span>
  {failed&&<span className="mq-optical-fallback" role="status">Graphics unavailable</span>}
 </button>;
}
export type OpticalPlaygroundProps=Partial<OpticalSettings>&OpticalTiming&{paused?:boolean;compact?:boolean;perspective?:boolean;className?:string;label?:string};
export function OpticalStage({children,compact=false,perspective=false,className='',style}:{children:ReactNode;compact?:boolean;perspective?:boolean;className?:string;style?:CSSProperties}){
 return <div className={`mq-optical-playground ${className}`} style={style} data-compact={compact||undefined}><style>{playgroundStyles}</style>
  <div className="mq-optical-stage"><div className="mq-optical-pair" data-tilted={perspective||undefined}>{children}</div></div>
 </div>;
}
/** A clean canvas; all configuration belongs to the consuming inspector. */
export default function OpticalPlayground({paused=false,compact=false,perspective=false,className='',label='Optical Button',...settings}:OpticalPlaygroundProps){
 return <OpticalStage compact={compact} perspective={perspective} className={className}><OpticalButton {...settings} paused={paused} compact={compact}>{label}</OpticalButton></OpticalStage>;
}
const buttonStyles=`.mq-optical-button{position:relative;display:inline-flex;flex:none;align-items:center;justify-content:center;width:294px;height:80px;padding:0 24px;margin:0;appearance:none;border:0!important;box-shadow:none!important;background:transparent!important;color:#fff;font:500 16px/1.2 system-ui,sans-serif;cursor:pointer;isolation:isolate}.mq-optical-button.mq-optical-icon{width:80px;padding:0}.mq-optical-button>canvas{position:absolute;inset:-20px;width:calc(100% + 40px);height:calc(100% + 40px);pointer-events:none}.mq-optical-label{position:relative;display:flex;gap:20px;align-items:center;pointer-events:none}.mq-optical-arrow{display:inline-block;font-size:24px;transition:transform .25s ease}.mq-optical-button:hover .mq-optical-arrow{transform:translateX(3px) rotate(-20deg)}.mq-optical-button:focus-visible{outline:2px solid #b4d9ff;outline-offset:3px;border-radius:999px}.mq-optical-button:disabled{opacity:.4;cursor:default}.mq-optical-fallback{position:absolute;top:100%;font-size:9px;color:#9ca3af;white-space:nowrap}@media(prefers-reduced-motion:reduce){.mq-optical-arrow{transition:none}.mq-optical-button:hover .mq-optical-arrow{transform:none}}`;
const playgroundStyles=`.mq-optical-playground{position:relative;width:100%;height:100%;min-height:180px;background:#08080a;display:grid;overflow:hidden;color:#ececf2;font-family:system-ui,sans-serif}.mq-optical-stage{min-width:0;display:grid;place-items:center;perspective:900px;overflow:hidden}.mq-optical-pair{transform:scale(1);transition:transform .5s ease;transform-style:preserve-3d}.mq-optical-pair[data-tilted]{transform:rotateX(24deg) rotateY(-14deg) rotateZ(-5deg)}.mq-optical-playground[data-compact] .mq-optical-pair{transform:scale(.94)}@media(prefers-reduced-motion:reduce){.mq-optical-pair{transition:none}}`;
