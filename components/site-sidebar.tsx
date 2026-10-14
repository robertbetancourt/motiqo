'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import NavigationIcon from './navigation-icon';
import SidebarArt from './sidebar-art';
import Brand from './brand';
import ColorPicker from './color-picker';
import GitHubControl from './github-control';
import ThemeControl from './theme-control';
export type SidebarProps = {
    collection?: boolean;
    savedOnly?: boolean;
    savedCount?: number;
    onCollection?: () => void;
    onSaved?: () => void;
};
export default function SiteSidebar({ collection = false, savedOnly = false, savedCount = 0, onCollection, onSaved }: SidebarProps) {
    const pathname = usePathname(), [open, setOpen] = useState(false), toggle = useRef<HTMLButtonElement>(null);
    const nav = useRef<HTMLElement>(null);
    useEffect(() => {
        const root = nav.current!, active = root.querySelector<HTMLElement>('[aria-current="page"]'), media = matchMedia('(prefers-reduced-motion: reduce)');
        let raf = 0, last = performance.now(), y = Number(root.dataset.lightY ?? active?.offsetTop ?? 0);
        let target = active?.offsetTop ?? 0;
        const tick = (now: number) => { y += (target - y) * (1 - Math.exp(-Math.min(.05, (now - last) / 1000) * 10)); last = now; root.style.setProperty('--nav-y', `${y}px`); root.dataset.lightY = String(y); if (Math.abs(y - target) > .05)
            raf = requestAnimationFrame(tick); };
        const measure=()=>{
            target=root.querySelector<HTMLElement>('[aria-current="page"]')?.offsetTop??0;
            cancelAnimationFrame(raf);
            if(media.matches){root.style.setProperty('--nav-y',`${target}px`);root.dataset.lightY=String(target);}
            else {last=performance.now();raf=requestAnimationFrame(tick);}
        };
        const size=new ResizeObserver(measure);size.observe(root);measure();
        return () => {cancelAnimationFrame(raf);size.disconnect();};
    }, [pathname, savedOnly]);
    useEffect(() => setOpen(false), [pathname, savedOnly]);
    useEffect(() => { const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus({ preventScroll: true });
    } }; document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape); }, []);
    const library = pathname === '/library';
    const items = [{ name: 'Home', href: '/', icon: 'home' as const, active: pathname === '/' }, { name: 'Library', href: '/library', icon: 'library' as const, active: library && !savedOnly, action: library ? onCollection : undefined },
        { name: 'Saved', href: '/library?saved=1', icon: 'saved' as const, active: library && savedOnly, action: library ? onSaved : undefined, count: savedCount }, { name: 'Getting started', href: '/docs', icon: 'docs' as const, active: pathname === '/docs' }];
    return <>
    <div className="sidebar-mobile-bar"><Link href="/" aria-label="Motiqo home"><Brand variant="logo"/></Link><button ref={toggle} className="icon-button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-controls="site-sidebar" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={20}/> : <Menu size={20}/>}</button></div>
    {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)}/>}
    <aside id="site-sidebar" className={`site-sidebar ${open ? 'is-open' : ''}`} aria-label="Motiqo navigation">
      <div className="sidebar-heading"><Link className="sidebar-brand" href="/" aria-label="Motiqo home"><Brand variant="logo"/></Link><GitHubControl/></div>
      <span className="sidebar-eyebrow">Menu</span>
      <nav ref={nav} aria-label="Main navigation"><div className="sidebar-light" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties}/>)}</div>{items.map(item => <Link key={item.name} href={item.href} aria-current={item.active ? 'page' : undefined} className={`sidebar-link ${item.active ? 'is-active' : ''}`} onClick={event => { setOpen(false); if (item.action) {
        event.preventDefault();
        item.action();
    } }}><NavigationIcon name={item.icon}/><span>{item.name}</span>{!!item.count && <small>{item.count}</small>}</Link>)}</nav>
      <div className="sidebar-personality"><SidebarArt /></div>
      <div className="sidebar-tools"><ColorPicker /><ThemeControl/></div>
    </aside>
  </>;
}
