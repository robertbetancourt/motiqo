'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Brand from './brand';

export default function SiteFooter() {
  return <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><Link href="/" aria-label="Motiqo home"><Brand variant="imagotype" /></Link><p>A little motion.<br />A lot of character.</p></div><div className="footer-links"><div><span className="eyebrow">EXPLORE</span><Link href="/">Home</Link><Link href="/library">Library</Link><Link href="/docs">Docs</Link><Link href="/sponsors">Sponsor Motiqo</Link></div><div><span className="eyebrow">TOOLS</span><Link href="/docs#installation">CLI <small>Download</small></Link><Link href="/skill">Skill <small>Install</small></Link><Link href="/mcp">MCP <small>Connect</small></Link></div></div><a className="maker-link cursor-target" href="https://robertbetancourt.vercel.app" target="_blank" rel="noreferrer"><span className="eyebrow">DESIGNED & BUILT BY</span><span>Robert Betancourt <ArrowUpRight size={17}/></span><small>Independent designer. Curious by default.</small></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Motiqo. All rights reserved.</span><span className="footer-status"><span className="status-dot"/> ALWAYS IN MOTION</span><span>MADE WITH INTENTION / 001</span></div></footer>;
}
