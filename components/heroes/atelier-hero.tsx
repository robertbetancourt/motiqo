'use client';
import {useEffect,useRef,useState} from 'react';
import styles from './heroes.module.css';

export type AtelierHeroProps={brandName?:string;titleLine1?:string;titleLine2?:string;subtitle?:string;ctaText?:string;autoRotateMaquette?:boolean;paused?:boolean;className?:string};
export default function AtelierHero({brandName='FORMA ATELIER',titleLine1='Spaces shaped',titleLine2='around your life.',subtitle='A study in light, material and the quiet details of home. Step inside and explore every surface.',ctaText='Explore the house',autoRotateMaquette=true,paused=false,className=''}:AtelierHeroProps){
 const mount=useRef<HTMLDivElement>(null),scene=useRef<ReturnType<typeof import('./atelier-scene').createHouseScene>|null>(null),[inspection,setInspection]=useState(false),[label,setLabel]=useState(''),[menu,setMenu]=useState(false),[failed,setFailed]=useState(false),latest=useRef({paused,inspection});latest.current={paused,inspection};
 useEffect(()=>{let gone=false;import('./atelier-scene').then(({createHouseScene})=>{if(gone)return;try{scene.current=createHouseScene(mount.current!,{autoRotate:autoRotateMaquette,paused:latest.current.paused,onInspect:setLabel});scene.current.setInspection(latest.current.inspection);}catch{setFailed(true);}});return()=>{gone=true;scene.current?.destroy();scene.current=null;};},[autoRotateMaquette]);
 useEffect(()=>{scene.current?.setPaused(paused);},[paused]);
 useEffect(()=>{scene.current?.setInspection(inspection);},[inspection]);
 return <section className={`${styles.hero} ${styles.atelier} ${className}`} aria-label="Atelier architectural hero">
  <img className={styles.atelierBackdrop} src="/heroes/atelier-backdrop.webp" alt=""/>
  <div className={styles.cad} aria-hidden="true"><i/><i/><i/><i/><span/><span/><span/><span/></div>
  <nav className={styles.atelierNav} aria-label="Atelier"><strong>{brandName}</strong><button aria-label="Toggle Atelier menu" aria-expanded={menu} onClick={()=>setMenu(!menu)}><span/><span/><span/></button>{menu&&<div className={styles.atelierMenu}><button onClick={()=>{setInspection(true);setMenu(false);}}>Inspect the architecture</button><button onClick={()=>{scene.current?.reset();setMenu(false);}}>Reset the view</button></div>}</nav>
  <div className={styles.atelierCopy}><h1>{titleLine1}<br/>{titleLine2}</h1><p>{subtitle}</p><button className={styles.darkButton} aria-pressed={inspection} onClick={()=>setInspection(!inspection)}>{inspection?'Exit inspection':ctaText}</button></div>
  <div className={styles.maquette}><img src="/heroes/atelier-house.webp" alt="Limestone pavilion with a shaded terrace and reflecting pool"/><div ref={mount} className={styles.houseCanvas} data-failed={failed||undefined}/>{['tl','tr','bl','br'].map(corner=><span key={corner} className={styles[corner]} aria-hidden="true">+</span>)}{inspection&&<div className={styles.surfaceLabel} role="status">{label||'Drag to explore · Select a surface'}</div>}{failed&&<p className={styles.sceneNotice}>3D unavailable · Architectural study</p>}</div>
  <div className={styles.surfaceControls} aria-label="Model controls"><button onClick={()=>scene.current?.rotate(-Math.PI/8)} aria-label="Rotate model left">↶</button>{inspection?<button className={styles.inspectNext} onClick={()=>scene.current?.inspectNext()} aria-label="Inspect next surface">Next surface</button>:<span>DRAG TO EXPLORE</span>}<button onClick={()=>scene.current?.rotate(Math.PI/8)} aria-label="Rotate model right">↷</button></div>
  <div className={styles.ruler} aria-hidden="true"><span>+</span><div/ ><span>+</span></div>
 </section>;
}
