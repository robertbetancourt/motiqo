'use client';
import {useEffect,useRef} from 'react';

/** Seven precessing orbital planes. A single loop runs only while hovered or settling. */
export default function SidebarArt(){
  const host=useRef<HTMLDivElement>(null),shape=useRef<SVGGElement>(null),planet=useRef<SVGCircleElement>(null);
  useEffect(()=>{
    const root=host.current!,group=shape.current!,media=matchMedia('(prefers-reduced-motion: reduce)');
    const back=[...root.querySelectorAll<SVGPathElement>('[data-orbit-back]')],front=[...root.querySelectorAll<SVGPathElement>('[data-orbit-front]')];
    let frame=0,last=0,phase=0,x=0,y=0,tx=0,ty=0,energy=0,target=0,visible=true,gone=false;
    function orbit(t:number,index:number){
      const radius=65-index*2.5,tilt=.34+index*.24+phase*.13;
      let px=Math.cos(t)*radius,py=Math.sin(t)*radius*Math.cos(tilt),pz=Math.sin(t)*radius*Math.sin(tilt);
      const turn=-.55+index*.19+Math.sin(phase*.25+index)*.28;
      const nx=px*Math.cos(turn)+pz*Math.sin(turn);pz=-px*Math.sin(turn)+pz*Math.cos(turn);px=nx;
      const spin=phase*.1+index*.11,nx2=px*Math.cos(spin)-py*Math.sin(spin);py=px*Math.sin(spin)+py*Math.cos(spin);px=nx2;
      return {x:110+(px-py)*.7071,y:90+(px+py)*.35355-pz*.866,depth:(px+py)*.612+pz*.5};
    }
    function draw(){
      back.forEach((path,index)=>{
        let rear='',near='',wasRear=false,wasNear=false;
        for(let i=0;i<=80;i++){
          const p=orbit(i/80*Math.PI*2,index),point=`${p.x.toFixed(2)},${p.y.toFixed(2)}`;
          if(p.depth<0){rear+=(wasRear?'L':'M')+point;wasRear=true;wasNear=false;}
          else{near+=(wasNear?'L':'M')+point;wasNear=true;wasRear=false;}
        }
        path.setAttribute('d',rear);front[index].setAttribute('d',near);
      });
      const p=orbit(phase*.65+.2,3);planet.current!.setAttribute('cx',p.x.toFixed(2));planet.current!.setAttribute('cy',p.y.toFixed(2));
      group.setAttribute('transform',`translate(${(x*5).toFixed(2)} ${(y*4).toFixed(2)}) rotate(${(x*4).toFixed(2)} 110 90)`);
      root.dataset.orbitPhase=phase.toFixed(4);
    }
    function tick(now:number){
      frame=0;if(gone||!visible||document.hidden)return;
      const dt=Math.min(.05,(now-last)/1000),a=1-Math.exp(-dt*8);last=now;
      x+=(tx-x)*a;y+=(ty-y)*a;energy+=(target-energy)*a;phase+=dt*energy*.9;draw();
      if(target>0||energy>.001||Math.abs(x-tx)+Math.abs(y-ty)>.001)frame=requestAnimationFrame(tick);
    }
    function wake(){if(!gone&&!frame&&visible&&!document.hidden&&!media.matches&&(target>0||energy>.001||Math.abs(x-tx)+Math.abs(y-ty)>.001)){last=performance.now();frame=requestAnimationFrame(tick);}}
    const enter=()=>{target=1;wake();};
    const move=(event:PointerEvent)=>{const r=root.getBoundingClientRect();if(!r.width||!r.height)return;tx=(event.clientX-r.left)/r.width*2-1;ty=(event.clientY-r.top)/r.height*2-1;enter();};
    const leave=()=>{target=0;tx=ty=0;wake();};
    const up=(event:PointerEvent)=>{if(event.pointerType!=='mouse')leave();};
    const visibility=()=>{cancelAnimationFrame(frame);frame=0;wake();};
    const reduced=()=>{cancelAnimationFrame(frame);frame=0;if(media.matches){energy=target=x=y=tx=ty=0;draw();}else wake();};
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visibility();});observer.observe(root);
    root.addEventListener('pointerenter',enter);root.addEventListener('pointermove',move);root.addEventListener('pointerdown',move);root.addEventListener('pointerleave',leave);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',leave);
    document.addEventListener('visibilitychange',visibility);media.addEventListener('change',reduced);draw();
    return()=>{gone=true;cancelAnimationFrame(frame);observer.disconnect();root.removeEventListener('pointerenter',enter);root.removeEventListener('pointermove',move);root.removeEventListener('pointerdown',move);root.removeEventListener('pointerleave',leave);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',leave);document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',reduced);};
  },[]);
  const rings=(side:'back'|'front')=>Array.from({length:7},(_,i)=><path key={i} {...{[`data-orbit-${side}`]:i}} stroke={i===3?'var(--accent)':'var(--orb-ink)'} opacity={i===3?.75:side==='back'?.18:.3} strokeWidth={i===3?.85:.65}/>);
  return <div className="sidebar-art" ref={host} aria-hidden="true"><svg viewBox="0 0 220 190" fill="none"><ellipse cx="110" cy="155" rx="62" ry="10" fill="var(--orb-shadow)"/><g ref={shape}>{rings('back')}<path d="M110 32 156 59v56l-46 27-46-27V59Z" fill="var(--orb-face)" stroke="var(--orb-ink)" strokeOpacity=".4" strokeWidth=".7"/><path d="m64 59 46 27 46-27M110 86v56" stroke="var(--orb-ink)" strokeOpacity=".5" strokeWidth=".7"/>{rings('front')}<circle ref={planet} cx="160" cy="75" r="2.8" fill="var(--accent)"/></g><path d="M25 174h28m114 0h28" stroke="var(--orb-ink)" strokeOpacity=".2"/><text x="110" y="177" textAnchor="middle" fill="var(--subtle)" fontSize="7" letterSpacing="2" fontFamily="monospace">IN GOOD MOTION</text></svg></div>;
}
