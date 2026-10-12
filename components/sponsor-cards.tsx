'use client';

import Link from 'next/link';
import { ArrowUpRight, Plus, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

export default function SponsorCards({paused=false}:{paused?:boolean}) {
  const reducedPreference=useReducedMotion();
  const reduced=paused || reducedPreference;
  return <motion.section className="sponsor-section" aria-labelledby="sponsors-title" initial={reduced?false:{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.12}} transition={{duration:reduced?0:.6,ease:[.22,1,.36,1]}}><div className="sponsor-heading"><div><span className="eyebrow">GOOD COMPANY. GOOD POSSIBILITIES.</span><h2 id="sponsors-title">A little support goes a long way.</h2></div><Link className="cursor-target" href="/sponsors">Sponsor Motiqo <ArrowUpRight size={15}/></Link></div><div className="sponsor-grid">
    <Link href="/sponsors" className="sponsor-card sponsor-primary cursor-target"><div className="sponsor-card-top"><span className="eyebrow">SPONSOR / URIAT</span><ArrowUpRight size={18}/></div><div className="uriat-art"><img src="/media/uriat.webp" alt="Illustrated character for the Uriat sponsor concept" width={720} height={720}/><span>uriat<span>↗</span></span></div><div><h3>A little more possibility.</h3><p>A space for curious minds and their next bright idea.</p></div><span className="sponsor-cta">Meet Uriat <ArrowUpRight size={14}/></span></Link>
    <Link href="/sponsors" className="sponsor-card sponsor-outline cursor-target"><div className="sponsor-card-top"><span className="eyebrow">SPONSOR SPOT / 02</span><Plus size={18}/></div><div className="sponsor-outline-art"><span>YOUR<br/><i>BRAND</i><br/>HERE.</span><Sparkles size={23}/></div><div><h3>Small space.<br/>Meaningful connection.</h3><p>Introduce your product to people who care about the details.</p></div><span className="sponsor-cta">Become a sponsor <ArrowUpRight size={14}/></span></Link>
    <a href="https://robertbetancourt.vercel.app" target="_blank" rel="noreferrer" className="sponsor-card maker-card cursor-target"><div className="sponsor-card-top"><span className="eyebrow">FROM THE MAKER</span><ArrowUpRight size={18}/></div><div className="maker-art"><img src="/media/tiger.webp" alt="Red tiger illustration" width={1000} height={560}/><span>INSTINCT<br/>OVER ORDINARY.</span></div><div><h3>Made with curiosity.<br/>By Robert.</h3><p>Explore the work behind the collection.</p></div><span className="sponsor-cta">Visit my portfolio <ArrowUpRight size={14}/></span></a>
  </div></motion.section>;
}
