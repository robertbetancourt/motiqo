export type HeroFrame={time:number;dt:number;still:boolean};

/** One clock per scene; hidden, offscreen and reduced-motion scenes sleep. */
export function heroClock(host:HTMLElement,draw:(frame:HeroFrame)=>void,resize?:(width:number,height:number)=>void,paused:()=>boolean=()=>false){
 let frame=0,last=0,time=0,visible=true,gone=false;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 function tick(now:number){
  frame=0;if(gone||!visible||document.hidden)return;
  const still=motion.matches||paused(),dt=still?0:Math.min((now-(last||now))/1000,.04);last=now;time+=dt;
  draw({time,dt,still});host.dataset.ready='true';
  if(!still&&!frame)frame=requestAnimationFrame(tick);
 }
 function invalidate(){if(!gone&&!frame&&visible&&!document.hidden)frame=requestAnimationFrame(tick);}
 function visibility(){last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else invalidate();}
 const size=new ResizeObserver(()=>{resize?.(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight));invalidate();});size.observe(host);
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=0;if(visible)invalidate();else{cancelAnimationFrame(frame);frame=0;}});intersection.observe(host);
 document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',invalidate);invalidate();
 return {invalidate,dispose(){gone=true;cancelAnimationFrame(frame);size.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',invalidate);}};
}
