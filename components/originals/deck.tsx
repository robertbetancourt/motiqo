'use client';
import {useEffect,useId,useRef} from 'react';
import {deckActivity,deckClamp,deckCylinder,deckHit,deckKeys,deckMatrix,deckOrder,deckProject,deckSpring,deckStep} from './deck-math';

export type DeckProps={colors?:readonly [string,string,string,string];springSpeed?:number;speed?:number;autoPlay?:boolean;elevation?:number;compact?:boolean;paused?:boolean;className?:string};
const defaults=['#bdde83','#5ee7d3','#a791f4','#e6ce84'] as const;
const valid=(color:string|undefined,fallback:string)=>color&&/^#[\da-f]{6}$/i.test(color)?color:fallback;
const keyCorners=[[-12.5,-12.5],[12.5,-12.5],[12.5,12.5],[-12.5,12.5]];
const circuits=[[-231,-231,231,231],[-222,-222,222,222],[-211,-211,211,211]];
function perimeter(a:number,b:number,c:number,d:number){return[deckProject(a,b),deckProject(c,b),deckProject(c,d),deckProject(a,d)].map(p=>p.join(',')).join(' ');}
function Icon({bank,index}:{bank:number;index:number}){
  if(bank===0)return <circle r="6"/>;
  if(bank===1)return <><rect x="-6" y="-6" width="12" height="12" rx="1"/><path d="m-5 5 10-10"/></>;
  if(bank===2)return <><rect x="-7" y="-5" width="14" height="10" rx="1"/><path d="M-3-3V3M1-3V3"/></>;
  return <>{Array.from({length:index%3+1},(_,i)=><circle key={i} cx={(i-(index%3)/2)*5} cy="0" r="1.6"/>)}</>;
}
function Knob(){const base=deckCylinder(39,24),top=deckCylinder(26,34);return <g className="deck-knob" fill="#08080a" stroke="#85858f" strokeWidth="1" strokeLinejoin="round"><path d={base.wall}/><ellipse cy="-24" rx={base.rx} ry={base.ry}/><g transform="translate(0 -24)"><path d={top.wall}/><ellipse cy="-34" rx={top.rx} ry={top.ry}/><ellipse cy="-34" rx={top.rx-4} ry={top.ry-3} fill="none" strokeOpacity=".35"/><path d={`M0,-${34+top.ry-4}v5`} strokeOpacity=".65"/></g></g>;}

export default function Deck({colors=defaults,springSpeed=1,speed=1,autoPlay=true,elevation=1,compact=false,paused=false,className=''}:DeckProps){
  const host=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null),knob=useRef<SVGGElement>(null),pad=useRef<SVGGElement>(null),faces=useRef<(SVGGElement|null)[]>([]),lights=useRef<(SVGGElement|null)[]>([]),projections=useRef<(SVGGElement|null)[]>([]),pulses=useRef<(SVGCircleElement|null)[]>([]),sync=useRef<()=>void>(()=>{}),id=useId().replace(/:/g,'');
  const options=useRef({springSpeed,speed,autoPlay,elevation,paused});options.current={springSpeed,speed,autoPlay,elevation,paused};
  useEffect(()=>sync.current(),[springSpeed,speed,autoPlay,elevation,paused]);
  useEffect(()=>{
    const root=host.current!,surface=svg.current!,media=matchMedia('(prefers-reduced-motion: reduce)'),heights=deckKeys.map(()=>deckSpring()),brightness=deckKeys.map(()=>deckSpring()),position={x:deckSpring(),y:deckSpring(),z:deckSpring(76)},padLight=deckSpring();
    let raf=0,last=0,time=0,active:number|null=null,pinned:number|null=null,entered=0,inside=false,visible=true,gone=false,box=surface.getBoundingClientRect(),samples=0,sampleStart=0,down:{x:number;y:number;key:number|null}|null=null;
    function draw(dt=0){
      const o=options.current,still=media.matches,current=active??pinned,age=time-entered,activity=deckActivity(current,age,time,o.autoPlay&&!still&&!inside,pinned!==null),lift=deckClamp(o.elevation,.3,1.8),rate=deckClamp(o.springSpeed,.35,2);
      for(const key of deckKeys){const z=deckStep(heights[key.id],activity.lifts[key.id]*lift,dt,rate,still),light=deckClamp(deckStep(brightness[key.id],activity.lights[key.id],dt,rate,still),0,1),face=faces.current[key.id],projection=projections.current[key.id];
        face?.setAttribute('transform',`translate(0 ${(-z).toFixed(3)})`);lights.current[key.id]?.setAttribute('opacity',light.toFixed(3));
        if(projection){projection.setAttribute('opacity',(deckClamp(z/20,0,1)*.44).toFixed(3));const lines=projection.querySelector('path')!;lines.setAttribute('d',keyCorners.map(([dx,dy])=>{const p=deckProject(key.x+dx,key.y+dy);return`M${p[0].toFixed(3)},${p[1].toFixed(3)}v${(-Math.max(0,z)).toFixed(3)}`;}).join(''));}
      }
      const x=deckStep(position.x,activity.x,dt,rate*.42,still),y=deckStep(position.y,activity.y,dt,rate*.42,still),z=deckStep(position.z,activity.z*lift,dt,rate*.42,still),p=deckProject(x,y,z);
      knob.current?.setAttribute('transform',`translate(${p[0].toFixed(3)} ${p[1].toFixed(3)})`);pad.current?.setAttribute('opacity',deckClamp(deckStep(padLight,activity.pad,dt,rate,still),0,1).toFixed(3));
      pulses.current.forEach((node,i)=>{if(!node)return;const u=((time*.07+i*.23)%1)*4,a=-231+i*9,b=231-i*9,side=Math.floor(u),f=u%1,point=side===0?deckProject(a+(b-a)*f,a):side===1?deckProject(b,a+(b-a)*f):side===2?deckProject(b-(b-a)*f,b):deckProject(a,b-(b-a)*f);node.setAttribute('cx',point[0].toFixed(3));node.setAttribute('cy',point[1].toFixed(3));});
      root.dataset.active=activity.selected===null?'none':String(activity.selected);root.dataset.pinned=pinned===null?'none':String(pinned);root.dataset.knob=`${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;root.dataset.time=time.toFixed(3);root.dataset.ready='true';
    }
    function stop(){cancelAnimationFrame(raf);raf=0;}
    function tick(now:number){raf=0;if(gone||!root.isConnected||!visible||document.hidden)return;if(options.current.paused||media.matches){draw();return;}const elapsed=now-last;if(elapsed<1000/60-.5){raf=requestAnimationFrame(tick);return;}const dt=Math.min(.05,elapsed/1000);last=now;time+=dt*deckClamp(options.current.speed,.3,2);draw(dt);samples++;if(now-sampleStart>=750){root.dataset.fps=(samples*1000/(now-sampleStart)).toFixed(1);sampleStart=now;samples=0;}raf=requestAnimationFrame(tick);}
    function wake(){if(!gone&&!raf&&visible&&!document.hidden){last=sampleStart=performance.now();samples=0;raf=requestAnimationFrame(tick);}}
    function changed(){stop();draw();wake();}sync.current=changed;
    function select(next:number|null){if(next!==active){active=next;entered=time;}if(media.matches)draw();else wake();}
    function point(event:PointerEvent){const scale=Math.min(box.width/1000,box.height/760);if(!scale)return null;return deckHit((event.clientX-box.left-(box.width-1000*scale)/2)/scale,(event.clientY-box.top-(box.height-760*scale)/2)/scale);}
    function move(event:PointerEvent){if(options.current.paused)return;inside=true;select(point(event));}
    function leave(){inside=false;select(null);}
    function press(event:PointerEvent){if(options.current.paused||compact)return;const next=point(event);down={x:event.clientX,y:event.clientY,key:next};active=next;entered=time;surface.focus({preventScroll:true});if(media.matches)draw();else wake();}
    function release(event:PointerEvent){if(down&&!options.current.paused&&Math.hypot(event.clientX-down.x,event.clientY-down.y)<8&&point(event)===down.key){pinned=down.key===pinned?null:down.key;entered=time;}down=null;if(media.matches)draw();else wake();}
    function cancel(){down=null;leave();}
    function key(event:KeyboardEvent){if(options.current.paused||compact||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter',' ','Escape'].includes(event.key))return;event.preventDefault();const current=active??pinned??0;if(event.key==='Escape'){pinned=null;select(null);}else if(event.key===' '||event.key==='Enter'){pinned=pinned===current?null:current;entered=time;select(current);}else{const next=event.key==='Home'?0:event.key==='End'?64:deckClamp(current+(event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:event.key==='ArrowUp'?-4:4),0,64);select(next);}if(media.matches)draw();else wake();}
    function measure(){box=surface.getBoundingClientRect();}function visibility(){stop();wake();}
    const resize=new ResizeObserver(measure),observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;visibility();});resize.observe(surface);observer.observe(root);surface.addEventListener('pointermove',move);surface.addEventListener('pointerdown',press);surface.addEventListener('pointerup',release);surface.addEventListener('pointerleave',cancel);surface.addEventListener('pointercancel',cancel);surface.addEventListener('keydown',key);surface.addEventListener('blur',cancel);window.addEventListener('scroll',measure,true);document.addEventListener('visibilitychange',visibility);media.addEventListener('change',changed);draw();wake();
    return()=>{gone=true;stop();sync.current=()=>{};resize.disconnect();observer.disconnect();surface.removeEventListener('pointermove',move);surface.removeEventListener('pointerdown',press);surface.removeEventListener('pointerup',release);surface.removeEventListener('pointerleave',cancel);surface.removeEventListener('pointercancel',cancel);surface.removeEventListener('keydown',key);surface.removeEventListener('blur',cancel);window.removeEventListener('scroll',measure,true);document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',changed);};
  },[compact]);
  const gradient=`url(#${id}-spectrum)`,halo=`url(#${id}-halo)`;
  return <div ref={host} className={`deck ${className}`} data-compact={compact||undefined}><style>{styles}</style><svg ref={svg} viewBox="0 0 1000 760" role="group" tabIndex={compact?-1:0} aria-label="Deck, an interactive isometric hardware deck. Hover or tap a key. The centre starts a cascade. Arrow keys explore, Home and End select a key or the touchpad, Enter pins, Escape releases.">
    <defs><linearGradient id={`${id}-spectrum`} x1="0" y1="0" x2="1" y2=".7">{[0,1,2,3].map(i=><stop key={i} offset={i/3} stopColor={valid(colors[i],defaults[i])}/>)}</linearGradient><filter id={`${id}-halo`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter></defs>
    <g fill="none" stroke="#62626d" strokeWidth="1" strokeLinejoin="round" strokeOpacity=".38">{circuits.map((p,i)=><polygon key={i} points={perimeter(...p as [number,number,number,number])} strokeOpacity={.4-i*.09}/>)}<g strokeOpacity=".15">{[-203,203].map(v=><g key={v}><path d={`M${deckProject(v,-203).join(',')}L${deckProject(v,203).join(',')}`}/><path d={`M${deckProject(-203,v).join(',')}L${deckProject(203,v).join(',')}`}/></g>)}</g></g>
    <g fill="none" stroke="#74747e" strokeWidth="1" strokeOpacity=".3">{[-142,142].flatMap(x=>[-142,142].map(y=><rect key={`${x}-${y}`} transform={deckMatrix(x,y)} x="-69" y="-69" width="138" height="138" rx="9"/>))}<g transform={deckMatrix(0,0)}><rect x="-72" y="-72" width="144" height="144" rx="9" fill="#08080a"/>{[17,41,60].map(r=><circle key={r} r={r}/>)}</g></g>
    <g ref={pad} fill="none" stroke={gradient} strokeWidth="1" opacity="0" transform={deckMatrix(0,0)}><rect x="-72" y="-72" width="144" height="144" rx="9"/>{[17,41,60].map(r=><g key={r}><circle r={r} strokeWidth="3" opacity=".4" filter={halo}/><circle r={r}/></g>)}</g>
    {deckOrder.map(k=><g key={k.id} data-key={k.id}><g ref={node=>{projections.current[k.id]=node;}} opacity="0" fill="none" stroke="#92929b" strokeWidth="1" strokeDasharray="2 5"><ellipse cx={deckProject(k.x,k.y)[0]} cy={deckProject(k.x,k.y)[1]} rx="19.6" ry="11.3"/><path/></g><g ref={node=>{faces.current[k.id]=node;}}><g transform={deckMatrix(k.x,k.y)}><g fill="#08080a" stroke="#676771" strokeWidth="1"><path d="M-12.5 1v14q0 2 3 2h19q3 0 3-2V1"/><rect x="-12.5" y="-12.5" width="25" height="25" rx="3.5"/></g><g fill="none" stroke="#74747c" strokeWidth="1" opacity=".5"><rect x="-10" y="-10" width="20" height="20" rx="2"/><Icon bank={k.bank} index={k.id}/></g><g ref={node=>{lights.current[k.id]=node;}} opacity="0" fill="none" stroke={gradient} strokeWidth="1"><rect x="-12.5" y="-12.5" width="25" height="25" rx="3.5" strokeWidth="4" opacity=".3" filter={halo}/><rect x="-12.5" y="-12.5" width="25" height="25" rx="3.5"/><Icon bank={k.bank} index={k.id}/></g></g></g></g>)}
    <g fill={gradient} filter={halo}>{[0,1,2].map(i=><circle key={i} ref={node=>{pulses.current[i]=node;}} r="2.5"/>)}</g>
    <g ref={knob} transform="translate(500 349)" pointerEvents="none"><Knob/></g>
  </svg></div>;
}
const styles=`.deck{position:relative;width:100%;height:100%;min-height:0;display:grid;place-items:center;overflow:hidden;background:#08080a;container-type:size;user-select:none}.deck>svg{display:block;width:100%;height:100%;max-height:100%;outline:none;touch-action:pan-y}.deck svg *{vector-effect:non-scaling-stroke}.deck svg:focus-visible{outline:1px solid #fff;outline-offset:-5px}.deck-knob{stroke-opacity:.66}`;
