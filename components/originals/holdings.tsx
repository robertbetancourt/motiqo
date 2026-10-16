'use client';

import {useEffect,useId,useMemo,useRef,useState} from 'react';

export type Holding={name:string;ticker:string;value:number;color:string};
export type HoldingsProps={holdings?:Holding[];target?:number;scale?:number;speed?:number;thickness?:number;gap?:number;activity?:number;compact?:boolean;paused?:boolean;className?:string};
export const sampleHoldings:Holding[]=[{name:'Microsoft',ticker:'MSFT',value:16240,color:'#d653fb'},{name:'Apple',ticker:'AAPL',value:13860,color:'#8962ff'},{name:'NVIDIA',ticker:'NVDA',value:10640,color:'#42cfff'},{name:'Alphabet',ticker:'GOOGL',value:8920,color:'#51efb1'},{name:'Amazon',ticker:'AMZN',value:7160,color:'#d7ed65'},{name:'Tesla',ticker:'TSLA',value:4980,color:'#ffa052'}];
export const holdingsClamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
export function holdingsSegments(values:number[],target=80000,gap=2){
  const total=values.reduce((sum,n)=>sum+Math.max(0,Number.isFinite(n)?n:0),0),span=Math.min(1,total/holdingsClamp(target,1,1000000))*360;
  let cursor=-82;
  return values.map(value=>{const degrees=total?Math.max(0,Number.isFinite(value)?value:0)/total*span:0,space=Math.min(holdingsClamp(gap,0,8),degrees*.3),start=cursor+space/2,end=cursor+Math.max(space/2,degrees-space/2);cursor+=degrees;return{start,end,degrees:Math.max(0,end-start)};});
}
export function holdingsArc(start:number,end:number,radius=116){
  const point=(angle:number)=>{const a=angle*Math.PI/180;return[160+Math.cos(a)*radius,160+Math.sin(a)*radius];},a=point(start),b=point(end);
  if(end-start<.001)return '';
  if(end-start>=359.999){const m=point(start+180);return `M${a.map(n=>n.toFixed(3)).join(',')}A${radius},${radius} 0 1 1 ${m.map(n=>n.toFixed(3)).join(',')}A${radius},${radius} 0 1 1 ${b.map(n=>n.toFixed(3)).join(',')}`;}
  return `M${a.map(n=>n.toFixed(3)).join(',')}A${radius},${radius} 0 ${end-start>180?1:0} 1 ${b.map(n=>n.toFixed(3)).join(',')}`;
}

export default function Holdings({holdings=sampleHoldings,target=80000,scale=1,speed=1,thickness=3,gap=2,activity=1,compact=false,paused=false,className=''}:HoldingsProps){
  const host=useRef<HTMLDivElement>(null),paths=useRef<(SVGPathElement|null)[]>([]),dots=useRef<(SVGCircleElement|null)[]>([]),readout=useRef<HTMLSpanElement>(null),legend=useRef<(HTMLSpanElement|null)[]>([]),sync=useRef<()=>void>(()=>{});
  const [selected,setSelected]=useState(-1),[hovered,setHovered]=useState(-1),active=hovered>=0?hovered:selected;
  const id=useId().replace(/:/g,''),data=useMemo(()=>holdings.slice(0,12).map(d=>({...d,value:holdingsClamp(d.value,0,100000),color:/^#[\da-f]{6}$/i.test(d.color)?d.color:'#8d91ff'})),[holdings]);
  const options=useRef({data,target,scale,speed,gap,activity,paused,active});options.current={data,target,scale,speed,gap,activity,paused,active};
  const baseValues=data.map(d=>d.value*holdingsClamp(scale,0,2)),arcs=holdingsSegments(baseValues,target,gap),total=baseValues.reduce((a,b)=>a+b,0);
  const initial=useRef({value:paused||compact?total:0,arcs:paused||compact?arcs:null});
  useEffect(()=>sync.current(),[data,target,scale,speed,gap,activity,paused,active]);
  useEffect(()=>{
    const root=host.current!,media=matchMedia('(prefers-reduced-motion: reduce)');let raf=0,last=0,time=0,entry=compact?1:0,visible=true,gone=false,metric=compact?total:0,sampleTime=0,samples=0,load=options.current.scale;
    function draw(dt=0){
      const o=options.current,still=media.matches||o.paused,p=still?1:entry*entry*entry*(entry*(entry*6-15)+10);
      load=still?o.scale:load+(o.scale-load)*(1-Math.exp(-dt*7));
      const values=o.data.map((d,i)=>d.value*holdingsClamp(load,0,2)*p*(still?1:1+Math.sin(time*(.55+i*.06)+i)*.025*holdingsClamp(o.activity,0,1)));
      const spans=holdingsSegments(values,Math.max(1,o.target),o.gap),sum=values.reduce((a,b)=>a+b,0),target=o.active>=0?(values[o.active]??sum):sum;
      metric=still?target:metric+(target-metric)*(1-Math.exp(-dt*9));
      if(readout.current)readout.current.textContent=`$${Math.round(metric).toLocaleString('en-US')}`;
      spans.forEach((arc,i)=>{
        paths.current[i]?.setAttribute('d',holdingsArc(arc.start,arc.end));
        if(legend.current[i])legend.current[i]!.textContent=`$${Math.round(values[i]).toLocaleString('en-US')}`;
        const dot=dots.current[i];if(!dot)return;const travel=(time*.23+i*.13)%1,angle=(arc.start+arc.degrees*travel)*Math.PI/180;
        dot.setAttribute('cx',(160+Math.cos(angle)*116).toFixed(3));dot.setAttribute('cy',(160+Math.sin(angle)*116).toFixed(3));dot.setAttribute('opacity',String(still?0:Math.sin(travel*Math.PI)*p*.8));
      });
      root.dataset.total=String(Math.round(sum));root.dataset.progress=p.toFixed(3);root.dataset.sceneTime=time.toFixed(3);root.dataset.ready='true';
    }
    function tick(now:number){
      raf=0;if(gone||!root.isConnected||!visible||document.hidden)return;
      if(options.current.paused||media.matches){draw();return;}
      const elapsed=now-last;if(elapsed<1000/60-.5){raf=requestAnimationFrame(tick);return;}
      const dt=Math.min(.05,elapsed/1000);last=now;time+=dt*holdingsClamp(options.current.speed,.3,2);entry=Math.min(1,entry+dt*holdingsClamp(options.current.speed,.3,2)/1.8);draw(dt);
      samples++;if(now-sampleTime>750){root.dataset.fps=(samples*1000/(now-sampleTime)).toFixed(1);sampleTime=now;samples=0;}
      raf=requestAnimationFrame(tick);
    }
    function stop(){cancelAnimationFrame(raf);raf=0;}
    function wake(){if(!gone&&!raf&&visible&&!document.hidden){last=sampleTime=performance.now();samples=0;raf=requestAnimationFrame(tick);}}
    function changed(){if(media.matches||options.current.paused)draw();wake();}sync.current=changed;
    function replay(event:KeyboardEvent){if(event.target!==root||event.key!==' '||media.matches||options.current.paused)return;event.preventDefault();entry=metric=0;wake();}
    function visibility(){stop();wake();}
    const observer=new IntersectionObserver(([item])=>{visible=item.isIntersecting;visibility();});observer.observe(root);root.addEventListener('keydown',replay);document.addEventListener('visibilitychange',visibility);media.addEventListener('change',changed);draw();wake();
    return()=>{gone=true;stop();sync.current=()=>{};observer.disconnect();root.removeEventListener('keydown',replay);document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',changed);};
  },[data]);
  const name=active>=0?(data[active]?.name??'Portfolio value'):'Portfolio value';
  return <div ref={host} className={`holdings ${className}`} data-compact={compact||undefined} tabIndex={compact?-1:0} role="group" aria-label="Holdings, a segmented stock portfolio with illustrative positions. Select a company to inspect its allocation. Space replays the reveal."><style>{styles}</style><div className="holdings-shell"><div className="holdings-dial">
    <svg viewBox="0 0 320 320" aria-hidden="true"><defs><radialGradient id={`${id}-sphere`} cx="50%" cy="50%" r="53%"><stop stopColor="#827594" stopOpacity=".025"/><stop offset=".68" stopColor="#827594" stopOpacity=".018"/><stop offset="1" stopColor="#827594" stopOpacity="0"/></radialGradient><filter id={`${id}-blur`} x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="9"/></filter></defs>
      <circle cx="160" cy="160" r="111" fill={`url(#${id}-sphere)`}/><circle cx="160" cy="160" r="116" fill="none" stroke="var(--holdings-track)" strokeWidth="1"/>
      {data.map((holding,i)=><g key={i} className="holdings-segment" style={{'--holdings-color':holding.color,opacity:active<0||active===i?1:.24,transition:'opacity 280ms linear'} as React.CSSProperties}><path d={holdingsArc(arcs[i].start,arcs[i].end)} stroke="var(--holdings-tone)" strokeWidth={holdingsClamp(thickness,1,8)*2.5} fill="none" opacity=".14" filter={`url(#${id}-blur)`}/><path ref={node=>{paths.current[i]=node;}} d={initial.current.arcs?.[i]?holdingsArc(initial.current.arcs[i].start,initial.current.arcs[i].end):''} stroke="var(--holdings-tone)" strokeWidth={holdingsClamp(thickness,1,8)} fill="none" strokeLinecap="butt"/><path d={holdingsArc(arcs[i].start,arcs[i].end)} stroke="transparent" strokeWidth="24" fill="none" onPointerEnter={()=>setHovered(i)} onPointerLeave={()=>setHovered(-1)} onClick={()=>setSelected(selected===i?-1:i)} style={{cursor:'pointer'}}/><circle ref={node=>{dots.current[i]=node;}} r="1.5" fill="#fff" opacity="0"/></g>)}
    </svg><button className="holdings-reading" onClick={()=>setSelected(-1)} aria-label={`Show total portfolio value, $${Math.round(total).toLocaleString('en-US')}`}><span className="holdings-number" aria-hidden="true" ref={readout}>${Math.round(initial.current.value).toLocaleString('en-US')}</span><span className="holdings-unit">USD</span><span className="holdings-label">{name}</span></button>

  </div><div className="holdings-legend" aria-label="Portfolio positions">{data.map((holding,i)=><button key={i} title={holding.ticker} aria-label={`${holding.name}, ${holding.ticker}, $${Math.round(baseValues[i]).toLocaleString('en-US')}`} aria-pressed={selected===i} onClick={()=>setSelected(selected===i?-1:i)} onPointerEnter={()=>setHovered(i)} onPointerLeave={()=>setHovered(-1)} style={{'--holding-color':holding.color} as React.CSSProperties}><span className="holdings-holding"><i/>{holding.name}</span><span aria-hidden="true" ref={node=>{legend.current[i]=node;}}>${Math.round(baseValues[i]).toLocaleString('en-US')}</span></button>)}</div><span className="holdings-accessible" role="status" aria-live="polite" aria-atomic="true">{active>=0?`${name}: $${Math.round(baseValues[active]??0).toLocaleString('en-US')}.`:`Portfolio value: $${Math.round(total).toLocaleString('en-US')}.`} Illustrative positions.</span><span className="holdings-note">ILLUSTRATIVE PORTFOLIO</span></div></div>;
}
const styles=`.holdings-accessible{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.holdings{--holdings-base:#08080a;--holdings-ink:#f5f4f8;--holdings-muted:#797580;--holdings-track:#ffffff0c;position:relative;display:grid;place-items:center;width:100%;height:100%;overflow:hidden;background:var(--holdings-base);color:var(--holdings-ink);container-type:size;outline:none}.holdings-shell{width:min(86cqw,65cqh,330px)}.holdings-dial{position:relative;aspect-ratio:1}.holdings-segment{--holdings-tone:var(--holdings-color)}.holdings-dial>svg{display:block;width:100%;height:100%;overflow:visible}.holdings-reading{position:absolute;left:50%;top:49%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;border:0;background:none;color:inherit;cursor:pointer;padding:12px;white-space:nowrap}.holdings-number{font-size:clamp(27px,9cqh,48px);font-weight:250;line-height:1;letter-spacing:-.055em;font-variant-numeric:tabular-nums}.holdings-unit{font-family:var(--font-mono),monospace;font-size:clamp(6px,1.6cqh,8px);letter-spacing:.22em;color:var(--holdings-muted);margin-top:10px}.holdings-label{font-size:clamp(8px,2.2cqh,11px);margin-top:8px;color:var(--holdings-ink)}.holdings-target{position:absolute;top:79%;left:0;width:100%;text-align:center;font-family:var(--font-mono),monospace;font-size:clamp(6px,1.6cqh,8px);color:var(--holdings-muted)}.holdings-target span{opacity:.7}.holdings-legend{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin-top:4px}.holdings-legend button{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:44px;padding:0;border:0;border-bottom:1px solid var(--holdings-track);background:none;color:var(--holdings-muted);font-size:11px;cursor:pointer;transition:color 250ms linear}.holdings-legend button[aria-pressed=true],.holdings-legend button:hover{color:var(--holdings-ink)}.holdings-holding{display:flex;align-items:center;gap:7px}.holdings-holding i{width:4px;height:4px;border-radius:50%;background:var(--holding-color);box-shadow:0 0 9px color-mix(in srgb,var(--holding-color) 35%,transparent)}.holdings-legend small{font-size:8px;opacity:.6}.holdings-note{display:block;text-align:center;font-family:var(--font-mono),monospace;font-size:6px;letter-spacing:.17em;color:var(--holdings-muted);opacity:.6;margin-top:18px}.holdings[data-compact=true] .holdings-legend,.holdings[data-compact=true] .holdings-note{display:none}.holdings[data-compact=true] .holdings-shell{width:min(88cqw,90cqh,330px)}.holdings:focus-visible,.holdings button:focus-visible{outline:1px solid #fff;outline-offset:3px;border-radius:8px}html[data-theme=light] .holdings-segment{--holdings-tone:color-mix(in srgb,var(--holdings-color) 65%,#000)}html[data-theme=light] .holdings{--holdings-base:#f8f7f5;--holdings-ink:#222127;--holdings-muted:#77727e;--holdings-track:#15111d10}@media(prefers-reduced-motion:reduce){.holdings-legend button{transition:none}}`;
