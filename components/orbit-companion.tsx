'use client';

import dynamic from 'next/dynamic';
import {useCallback,useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {orbitEvent,notifyOrbit,type OrbitReaction} from '@/lib/orbit-events';
import {angleToward,stepOrbit,type OrbitBounds,type OrbitMotion} from '@/lib/orbit-motion';
import type {AgentMood} from './originals/orbit-agent';
import styles from './orbit-companion.module.css';

const OrbitAgent=dynamic(()=>import('./originals/orbit-agent'),{ssr:false});
export default function OrbitCompanion(){
  const pathname=usePathname();
  return ['/docs','/skill','/mcp'].includes(pathname)?<OrbitPresence pathname={pathname}/>:null;
}
function OrbitPresence({pathname}:{pathname:string}){
  const root=useRef<HTMLDivElement>(null),gaze=useRef({x:0,y:0}),impulse=useRef(0);
  const [mood,setMood]=useState<AgentMood>('happy'),[awake,setAwake]=useState(true);
  const welcome=useRef<((mood:OrbitReaction)=>void)|null>(null);
  const greet=useCallback(()=>notifyOrbit('happy'),[]);
  useEffect(()=>{
    const host=root.current!,reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),coarse=window.matchMedia('(pointer: coarse)');
    const width=()=>document.documentElement.clientWidth||window.innerWidth;
    let bounds:OrbitBounds,home={x:0,y:0},raf=0,lastTime=0,clock=0,active=false,near=false,lastImpact=-10;
    let moodTimer:ReturnType<typeof setTimeout>|undefined,focusTarget:{x:number;y:number}|null=null;
    const s:OrbitMotion={x:0,y:0,vx:0,vy:0,roll:0,turn:0,turnV:0};
    const pointer={x:0,y:0,at:-10,heading:Math.PI*.8,seen:false};
    function measure(){
      const radius=coarse.matches||width()<=680?54:76;
      const edge=window.innerWidth>780?(document.querySelector('.site-sidebar')?.getBoundingClientRect().right??236):0;
      bounds={left:edge+radius,right:Math.max(edge+radius,width()-radius),top:radius+(width()<=780?68:16),bottom:window.innerHeight-radius-8};
      home=coarse.matches?{x:bounds.right-12,y:bounds.bottom-12}:{x:bounds.left+(bounds.right-bounds.left)*.34,y:Math.max(bounds.top,Math.min(bounds.bottom,window.innerHeight*.63))};
    }
    const express=(next:AgentMood)=>setMood(next);
    function impact(direction=1){
      if(reduced.matches||clock-lastImpact<.4)return;lastImpact=clock;impulse.current++;s.turnV+=direction*210;
    }
    function react(next:OrbitReaction){
      clearTimeout(moodTimer);if(next==='happy')impact(s.vx<0?-1:1);express(next);
      moodTimer=setTimeout(()=>express('idle'),1800);
    }
    function paint(){
      const speed=Math.hypot(s.vx,s.vy),stretch=1+Math.min(.1,speed/5000)+(near?.06:0);
      host.style.setProperty('--orbit-x',`${s.x.toFixed(2)}px`);host.style.setProperty('--orbit-y',`${s.y.toFixed(2)}px`);
      host.style.setProperty('--orbit-lean',`${s.roll.toFixed(2)}deg`);
      host.style.setProperty('--orbit-stretch',stretch.toFixed(3));host.style.setProperty('--orbit-squash',(1/stretch).toFixed(3));
    }
    function tick(now:number){
      raf=0;if(!active)return;
      const dt=lastTime?Math.min((now-lastTime)/1000,1/30):1/60;lastTime=now;clock+=dt;
      let target={x:home.x+Math.sin(clock*.65)*12,y:home.y+Math.sin(clock*.9)*9};
      if(focusTarget)target=focusTarget;
      else if(pointer.seen&&!coarse.matches){
        const idle=Math.max(0,clock-pointer.at-.45),explore=Math.max(0,idle-1.2)*.28;
        const angle=pointer.heading+explore+Math.sin(clock*.9)*.14,radius=98+Math.sin(clock*.75)*12;
        target={x:pointer.x+Math.cos(angle)*radius,y:pointer.y+Math.sin(angle)*radius*.84};
      }
      if(stepOrbit(s,target,bounds,dt))impact(s.vx<0?-1:1);
      if(pointer.seen){
        const dx=pointer.x-s.x,dy=pointer.y-s.y,distance=Math.hypot(dx,dy);
        gaze.current={x:Math.max(-1,Math.min(1,dx/140)),y:Math.max(-1,Math.min(1,dy/140))};
        if(distance<75&&!near)react('happy');near=distance<75;
      }
      paint();raf=requestAnimationFrame(tick);
    }
    function move(event:PointerEvent){
      if(document.hidden||reduced.matches||event.pointerType==='touch'||coarse.matches)return;
      const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
      if(!pointer.seen)pointer.heading=Math.atan2(s.y-event.clientY,s.x-event.clientX);
      else if(Math.hypot(dx,dy)>2)pointer.heading=angleToward(pointer.heading,Math.atan2(-dy,-dx),.28);
      pointer.x=event.clientX;pointer.y=event.clientY;pointer.at=clock;pointer.seen=true;focusTarget=null;
    }
    function focus(event:FocusEvent){
      const el=event.target;
      if(!(el instanceof HTMLElement)||el.closest('[data-orbit-companion]')||!el.matches('button,a,input,textarea,select,[role=tab]'))return;
      react('listening');
      if(!coarse.matches&&!reduced.matches&&clock-pointer.at>.18){
        const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,angle=Math.atan2(s.y-y,s.x-x);
        focusTarget={x:x+Math.cos(angle)*105,y:y+Math.sin(angle)*95};
      }
    }
    function pet(event:PointerEvent){
      const dx=event.clientX-s.x,dy=event.clientY-s.y,distance=Math.hypot(dx,dy);
      gaze.current={x:Math.max(-1,Math.min(1,dx/140)),y:Math.max(-1,Math.min(1,dy/140))};
      if(distance<90){react('happy');if(!reduced.matches){s.vx-=dx/Math.max(1,distance)*150;s.vy-=dy/Math.max(1,distance)*150;}}
      else if(event.pointerType==='touch')react('listening');
    }
    function signal(event:Event){const next=(event as CustomEvent).detail?.mood;if(next==='happy'||next==='listening')react(next);}
    function visibility(){
      active=!document.hidden&&!reduced.matches;setAwake(active);lastTime=0;
      if(active&&!raf)raf=requestAnimationFrame(tick);
      if(!active){cancelAnimationFrame(raf);raf=0;}
    }
    function resize(){measure();s.x=Math.max(bounds.left,Math.min(bounds.right,s.x));s.y=Math.max(bounds.top,Math.min(bounds.bottom,s.y));paint();}
    measure();s.x=home.x;s.y=home.y;paint();visibility();welcome.current=react;
    window.addEventListener('pointermove',move,{passive:true});window.addEventListener('pointerdown',pet,{passive:true});
    document.addEventListener('focusin',focus);window.addEventListener(orbitEvent,signal);document.addEventListener('visibilitychange',visibility);
    window.addEventListener('resize',resize);reduced.addEventListener('change',visibility);coarse.addEventListener('change',resize);
    return()=>{
      active=false;welcome.current=null;cancelAnimationFrame(raf);clearTimeout(moodTimer);
      window.removeEventListener('pointermove',move);window.removeEventListener('pointerdown',pet);document.removeEventListener('focusin',focus);
      window.removeEventListener(orbitEvent,signal);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',resize);
      reduced.removeEventListener('change',visibility);coarse.removeEventListener('change',resize);
    };
  },[]);
  useEffect(()=>{welcome.current?.('happy');},[pathname]);
  return <div ref={root} className={styles.companion} data-orbit-companion="" data-mood={mood} data-awake={awake}>
    <div className={styles.scene} aria-hidden="true"><OrbitAgent transparent showStars={false} gazeTarget={gaze} impulseTarget={impulse} interactive={false} ringCount={3} orbitSpeed={0.45} accentColor="#ef6052" agentMood={mood} paused={!awake}/></div>
    <button className={styles.greet} type="button" aria-label="Greet Orbit" onClick={greet} title="Orbit"/>
  </div>;
}
