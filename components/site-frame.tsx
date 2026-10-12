'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import type { ComponentProps, ReactNode } from 'react';
import Brand from './brand';
import SiteHeader from './site-header';
import SiteFooter from './site-footer';

type Props = ComponentProps<typeof SiteHeader> & { children: ReactNode; paused?: boolean; };

export default function SiteFrame({children, paused=false, ...navigation}: Props) {
  const reduced=useReducedMotion();
  return <>
    <aside className="side-rail" aria-label="Motiqo branding">
      <Link className="rail-logo" href="/" aria-label="Motiqo home"><Brand variant="isotype"/></Link>
      <div className="rail-bottom"><span className="rail-word">DETAILS MAKE THE DIFFERENCE</span><span className="status-dot"/><span className="rail-version">v.01</span></div>
    </aside>
    <div className={`site-shell ${paused?'motion-paused':''}`}><SiteHeader {...navigation}/><motion.main className="section-transition" initial={reduced||paused?false:{y:10}} animate={{y:0}} transition={{duration:reduced||paused?0:.32,ease:'linear'}}>{children}</motion.main><SiteFooter/></div>
  </>;
}
