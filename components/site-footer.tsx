'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Brand from './brand';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link href="/" aria-label="Motiqo home"><Brand variant="logo" /></Link>
          <p>A little motion.<br />A lot of character.</p>
        </div>
        <div className="footer-links">
          <div>
            <span className="eyebrow">EXPLORE</span>
            <Link href="/hero">Hero</Link>
            <Link href="/library">Components</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/sponsors">Sponsor Motiqo</Link>
          </div>
          <div>
            <span className="eyebrow">TOOLS</span>
            <Link href="/docs#installation">CLI</Link>
            <Link href="/skill">Skill</Link>
            <Link href="/mcp">MCP</Link>
          </div>
        </div>

      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Motiqo. All rights reserved.</span>
        <a className="maker-link cursor-target" href="https://robertbetancourt.vercel.app" target="_blank" rel="noreferrer">
          <span>Designed &amp; Develop by Robert Betancourt <ArrowUpRight size={17}/></span>
        </a>
      </div>
    </footer>
  );
}
