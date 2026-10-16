'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
/** Query state belongs to the URL; page-published actions can arrive later. */
function SidebarLocation({onChange}:{onChange:(route:string)=>void}){
    const pathname=usePathname(),params=useSearchParams();
    const route=pathname==='/library'&&params.get('saved')==='1'?'/library?saved=1':pathname;
    useLayoutEffect(()=>onChange(route),[route,onChange]);
    return null;
}
export default function SiteSidebar({ savedCount = 0, onCollection, onSaved }: SidebarProps) {
    const pathname = usePathname(), [open, setOpen] = useState(false), toggle = useRef<HTMLButtonElement>(null);
    const nav = useRef<HTMLElement>(null);
    const [route,setRoute]=useState<string|null>(()=>pathname==='/library'?null:pathname),[destination,setDestination]=useState<string|null>(null);
    const active=destination??route;
    const reportRoute=useCallback((next:string)=>{setRoute(next);setDestination(null);},[]);
    const updateLight = useRef<()=>void>(()=>{});
    useLayoutEffect(() => {
        const root=nav.current!;
        const measure=()=>{
            const selected=root.querySelector<HTMLElement>('[aria-current="page"]');
            root.dataset.lightVisible=String(!!selected);
            if(selected){root.style.setProperty('--nav-y',`${selected.offsetTop}px`);root.dataset.lightY=String(selected.offsetTop);}
        };
        measure();updateLight.current=measure;
        const size=new ResizeObserver(measure);size.observe(root);
        return()=>{size.disconnect();updateLight.current=()=>{};};
    },[]);
    useLayoutEffect(()=>updateLight.current(),[active]);
    useEffect(()=>setOpen(false),[route]);
    useEffect(() => { const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus({ preventScroll: true });
    } }; document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape); }, []);
    const library = pathname === '/library';
    const items = [{ name: 'Home', href: '/', icon: 'home' as const, active: active === '/' }, { name: 'Library', href: '/library', icon: 'library' as const, active: active === '/library', action: library ? onCollection : undefined },
        { name: 'Saved', href: '/library?saved=1', icon: 'saved' as const, active: active === '/library?saved=1', action: library ? onSaved : undefined, count: savedCount }, { name: 'Getting started', href: '/docs', icon: 'docs' as const, active: active === '/docs' }];
    return <>
    <Suspense fallback={null}><SidebarLocation onChange={reportRoute}/></Suspense>
    <div className="sidebar-mobile-bar"><Link href="/" aria-label="Motiqo home"><Brand variant="logo"/></Link><button ref={toggle} className="icon-button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-controls="site-sidebar" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={20}/> : <Menu size={20}/>}</button></div>
    {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)}/>}
    <aside id="site-sidebar" className={`site-sidebar ${open ? 'is-open' : ''}`} aria-label="Motiqo navigation">
      <div className="sidebar-heading"><Link className="sidebar-brand" href="/" aria-label="Motiqo home"><Brand variant="logo"/></Link><GitHubControl/></div>
      <span className="sidebar-eyebrow">Menu</span>
      <nav ref={nav} aria-label="Main navigation"><div className="sidebar-light" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties}/>)}</div>{items.map(item => <Link key={item.name} href={item.href} prefetch={true} aria-current={item.active ? 'page' : undefined} className={`sidebar-link ${item.active ? 'is-active' : ''}`} onNavigate={event => { setOpen(false);setDestination(item.href);if(item.action){event.preventDefault();startTransition(item.action);} }}><NavigationIcon name={item.icon}/><span>{item.name}</span>{!!item.count && <small>{item.count}</small>}</Link>)}</nav>
      <div className="sidebar-personality"><SidebarArt /></div>
      <div className="sidebar-tools"><ColorPicker /><ThemeControl/></div>
    </aside>
  </>;
}
