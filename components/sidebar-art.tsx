'use client';
import {useEffect,useId,useRef} from 'react';

/** A shaded orb with five independently precessing planes, split by depth. */
export default function SidebarArt(){
  const gradient=useId().replace(/:/g,'');
  const host=useRef<HTMLDivElement>(null),shape=useRef<SVGGElement>(null),planet=useRef<SVGCircleElement>(null);
  useEffect(()=>{
    const root=host.current!,group=shape.current!,satellite=planet.current!,media=matchMedia('(prefers-reduced-motion: reduce)');
    const back=[...root.querySelectorAll<SVGPathElement>('[data-orbit-back]')],front=[...root.querySelectorAll<SVGPathElement>('[data-orbit-front]')];
    let frame=0,last=0,phase=0,visible=true,gone=false;
    function orbit(t:number,index:number){
      const radius=51+index*3.5,tilt=.42+index*.42+phase*(.12+index*.025);
      let px=Math.cos(t)*radius,py=Math.sin(t)*radius*Math.cos(tilt),pz=Math.sin(t)*radius*Math.sin(tilt);
      const turn=.38+index*.65+phase*(index%2?-.16:.2);
      const nx=px*Math.cos(turn)+pz*Math.sin(turn);pz=-px*Math.sin(turn)+pz*Math.cos(turn);px=nx;
      const spin=-.4+index*.52+phase*.1,nx2=px*Math.cos(spin)-py*Math.sin(spin);py=px*Math.sin(spin)+py*Math.cos(spin);px=nx2;
      return {x:110+px,y:90+py,depth:pz};
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
      const p=orbit(phase*.85+.2,2);satellite.setAttribute('cx',p.x.toFixed(2));satellite.setAttribute('cy',p.y.toFixed(2));
      satellite.setAttribute('opacity',p.depth<0&&Math.hypot(p.x-110,p.y-90)<32?'0':'1');
      group.setAttribute('transform','translate(0 0)');
      root.dataset.orbitPhase=phase.toFixed(4);
    }
    function tick(now:number){
      frame=0;if(gone||!root.isConnected||!visible||document.hidden)return;
      const elapsed=now-last;
      if(elapsed<1000/60-.5){frame=requestAnimationFrame(tick);return;}
      const dt=Math.min(.05,elapsed/1000);last=now;
      phase+=dt*.12;draw();frame=requestAnimationFrame(tick);
    }
    function wake(){if(!gone&&!frame&&visible&&!document.hidden&&!media.matches){last=performance.now();frame=requestAnimationFrame(tick);}}
    const visibility=()=>{cancelAnimationFrame(frame);frame=0;wake();};
    const reduced=()=>{cancelAnimationFrame(frame);frame=0;if(media.matches)draw();else wake();};
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visibility();});observer.observe(root);
    document.addEventListener('visibilitychange',visibility);media.addEventListener('change',reduced);draw();wake();
    return()=>{gone=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',reduced);};
  },[]);
  const rings=(side:'back'|'front')=>Array.from({length:5},(_,i)=><path key={i} {...{[`data-orbit-${side}`]:i}} stroke={i===2?'var(--accent)':'var(--orb-ink)'} opacity={i===2?(side==='back'?.35:.85):side==='back'?.18:.4} strokeWidth={i===2?1:.65}/>);
  return <div className="sidebar-art" ref={host} aria-hidden="true"><svg viewBox="0 0 220 190" fill="none"><defs><radialGradient id={gradient} cx="32%" cy="25%" r="78%"><stop stopColor="color-mix(in srgb,var(--orb-ink) 48%,var(--orb-face))"/><stop offset=".6" stopColor="color-mix(in srgb,var(--orb-ink) 12%,var(--orb-face))"/><stop offset="1" stopColor="var(--orb-face)"/></radialGradient></defs><ellipse cx="110" cy="155" rx="62" ry="10" fill="var(--orb-shadow)"/><g ref={shape}>{rings('back')}<circle data-orb cx="110" cy="90" r="32" fill={`url(#${gradient})`} stroke="var(--orb-ink)" strokeOpacity=".35" strokeWidth=".7"/><ellipse cx="110" cy="90" rx="13" ry="32" stroke="var(--orb-ink)" strokeOpacity=".15" strokeWidth=".6" transform="rotate(-25 110 90)"/><ellipse cx="110" cy="90" rx="32" ry="10" stroke="var(--orb-ink)" strokeOpacity=".15" strokeWidth=".6" transform="rotate(-25 110 90)"/>{rings('front')}<circle ref={planet} cx="160" cy="75" r="2.8" fill="var(--accent)"/></g><path d="M25 174h28m114 0h28" stroke="var(--orb-ink)" strokeOpacity=".2"/><text x="110" y="177" textAnchor="middle" fill="var(--subtle)" fontSize="7" letterSpacing="2" fontFamily="monospace">IN GOOD MOTION</text></svg></div>;
}
