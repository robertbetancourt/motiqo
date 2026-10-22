'use client';
import {useState} from 'react';
import LiquidArtifact, {type ArtifactShape} from '../ui/liquid-artifact';
import styles from './heroes.module.css';

const observations = [
 {name:'Singularity', shape:2, note:'Where light takes another shape.'},
 {name:'Fold', shape:0, note:'A new perspective on the unseen.'},
 {name:'Signal', shape:1, note:'Something beyond the familiar.'},
] as const;
export type AsterHeroProps={paused?:boolean;brandName?:string;className?:string};
export default function AsterHero({paused=false,brandName='Aster',className=''}:AsterHeroProps){
 const [selected,setSelected]=useState(0),observation=observations[selected];
 return <section className={`${styles.hero} ${styles.aster} ${className}`} aria-label="Aster space observatory">
  <div className={styles.asterField}><LiquidArtifact defaultTheme="dark" defaultShape={observation.shape as ArtifactShape} particleDensity="medium" vortexSpeed={12} paused={paused} className={styles.asterArtifact}/></div>
  <nav className={styles.asterNav} aria-label="Aster"><strong><svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" stroke="currentColor" strokeWidth="1.2"/><circle cx="12" cy="12" r="4" fill="#08080a" stroke="currentColor"/></svg>{brandName}<span>OBSERVATORY</span></strong><span>Beyond the familiar.</span></nav>
  <div className={styles.asterCopy}><span className={styles.asterEyebrow}>A STUDY OF THE UNKNOWN</span><h1>At the edge<br/>{' '}of the known.</h1><p>Follow the light. See what takes shape.</p></div>
  <div className={styles.asterAction}><button onClick={()=>setSelected((selected+1)%observations.length)}>Begin observation <span aria-hidden="true">↗</span></button></div>
  <div className={styles.asterCaption} aria-live="polite"><span>OBSERVATION / 0{selected+1}</span><h2>{observation.name}</h2><p>{observation.note}</p></div>
  <footer className={styles.asterBottom}><span>AN INDEPENDENT EXPLORATION</span><div role="group" aria-label="Choose an observation">{observations.map((item,index)=><button key={item.name} aria-label={item.name} aria-pressed={selected===index} onClick={()=>setSelected(index)}><span>0{index+1}</span>{item.name}</button>)}</div></footer>
 </section>;
}
