'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SiteFrame from './site-frame';
import FoldText from './effects/fold-text';
import LiquidRelic from './ui/liquid-relic';
import LiquidAction from './liquid-action';

export default function Home(){
  return <SiteFrame><section className="home-hero" aria-labelledby="home-title"><div className="home-copy"><span className="eyebrow">MOTIQO / INTERACTIVE ELEMENTS</span><h1 id="home-title"><FoldText text={'Small details.\nStrong impressions.'} hinge="left" duration={.8} stagger={.025}/></h1><p>Objects, motion and interface details.<br/>Made to explore. Ready to make your own.</p><LiquidAction><Link className="prompt-button home-explore" href="/library"><span>Explore the library</span><ArrowRight size={16}/></Link></LiquidAction></div><Link className="home-art" href="/library?element=liquid-relic" aria-label="Explore Liquid Relic"><LiquidRelic compact/><span>Liquid Relic <ArrowRight size={14}/></span></Link></section><section className="home-note"><span className="eyebrow">BUILT WITH INTENTION</span><p>A growing library of original elements.<br/>Explore the source, shape the motion, make it yours.</p><Link href="/docs">Getting started <ArrowRight size={14}/></Link></section></SiteFrame>;
}
