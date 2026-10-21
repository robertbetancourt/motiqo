'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ComponentNavigationIcon from './component-navigation-icon';
import { componentGroups, componentGroupCounts, newComponentsByGroup, readComponentGroup, type ComponentGroup } from '@/lib/component-groups';
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
    onCollection?: (group?: ComponentGroup) => void;
    onSaved?: () => void;
};

/** Query state belongs to the URL; page-published actions can arrive later. */
function SidebarLocation({onChange}:{onChange:(route:string)=>void}){
    const pathname=usePathname(),params=useSearchParams();
    const group=readComponentGroup(params.get('group'));
    const route=pathname==='/library'?(params.get('saved')==='1'?'/library?saved=1':group?`/library?group=${group}`:'/library'):pathname;
    useLayoutEffect(()=>onChange(route),[route,onChange]);
    return null;
}

export default function SiteSidebar({ savedCount = 0, onCollection, onSaved }: SidebarProps) {
    const pathname = usePathname(), [open, setOpen] = useState(false), toggle = useRef<HTMLButtonElement>(null);
    const nav = useRef<HTMLElement>(null);
    const [componentsOpen,setComponentsOpen]=useState(false);
    const back=useRef<HTMLButtonElement>(null),componentsLink=useRef<HTMLAnchorElement>(null),focusMenu=useRef(false),keepMenuOpen=useRef(false);
    const [route,setRoute]=useState<string|null>(()=>pathname==='/library'?null:pathname),[destination,setDestination]=useState<string|null>(null);
    const active=destination??route;
    const pendingRoute=useRef<{from:string|null;to:string}|null>(null);
    const reportRoute=useCallback((next:string)=>{
        // A suspended location reader can still report the route we are leaving.
        if(pendingRoute.current?.from===next&&pendingRoute.current.to!==next)return;
        pendingRoute.current=null;
        setRoute(next);setDestination(null);
        setComponentsOpen(next.startsWith('/library')&&next!=='/library?saved=1');
    },[]);
    function selectDestination(href:string){pendingRoute.current={from:route,to:href};setDestination(href);}
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
    useLayoutEffect(()=>{
        updateLight.current();
        if(focusMenu.current){(componentsOpen?back.current:componentsLink.current)?.focus({preventScroll:true});focusMenu.current=false;}
    },[active,componentsOpen]);
    useEffect(()=>{if(keepMenuOpen.current){keepMenuOpen.current=false;return;}setOpen(false);},[route]);
    useEffect(() => { const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus({ preventScroll: true });
    } }; document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape); }, []);
    const library = pathname === '/library';
    const exploreItems = [
        { name: 'Home', href: '/', icon: 'home' as const, active: active === '/' },
        { name: 'Components', href: '/library', icon: 'library' as const, active: !!active?.startsWith('/library')&&active!=='/library?saved=1', action: library ? onCollection : undefined },
        { name: 'Saved', href: '/library?saved=1', icon: 'saved' as const, active: active === '/library?saved=1', action: library ? onSaved : undefined, count: savedCount }
    ];
    const resourceItems = [
        { name: 'MCP', href: '/mcp', icon: 'mcp' as const, active: active === '/mcp' },
        { name: 'Skill', href: '/skill', icon: 'skill' as const, active: active === '/skill' },
        { name: 'Docs', href: '/docs', icon: 'docs' as const, active: active === '/docs' }
    ];
    function browse(href:string,action?:()=>void){setOpen(false);selectDestination(href);action?.();}
    return <>
    <Suspense fallback={null}><SidebarLocation onChange={reportRoute}/></Suspense>
    <div className="sidebar-mobile-bar"><Link href="/" aria-label="Motiqo home"><Brand variant="logo"/></Link><button ref={toggle} className="icon-button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-controls="site-sidebar" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <ComponentNavigationIcon name="close" size={20}/> : <ComponentNavigationIcon name="menu" size={20}/>}</button></div>
    {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)}/>}
    <aside id="site-sidebar" className={`site-sidebar ${open ? 'is-open' : ''} ${componentsOpen?'has-component-menu':''}`} aria-label="Motiqo navigation">
      <div className="sidebar-heading"><Link className="sidebar-brand" href="/" aria-label="Motiqo home"><Brand variant="logo"/></Link><GitHubControl/></div>
      {componentsOpen && <button ref={back} type="button" className="sidebar-back" onClick={()=>{focusMenu.current=true;setComponentsOpen(false);}} aria-label="Back to main navigation"><ComponentNavigationIcon name="back" size={16}/><span>Components</span></button>}
      <nav ref={nav} data-view={componentsOpen?'components':'main'} aria-label={componentsOpen?'Component navigation':'Main navigation'}>
        <div className="sidebar-light" aria-hidden="true" />
        {componentsOpen?<>
        <Link href="/library" prefetch={false} className={`sidebar-link ${active==='/library'?'is-active':''}`} aria-current={active==='/library'?'page':undefined} onNavigate={event=>{if(library&&onCollection)event.preventDefault();browse('/library',library&&onCollection?()=>onCollection():undefined);}}><NavigationIcon name="library"/><span>Browse all</span></Link>
        {['Interface','Visuals'].map(section=><div className="sidebar-group" key={section}><span className="sidebar-group-title">{section}</span>{componentGroups.filter(group=>group.section===section).map(group=>{
          const available=componentGroupCounts[group.id]>0,count=componentGroupCounts[group.id],newCount=newComponentsByGroup[group.id],href=`/library?group=${group.id}`,selected=active===href;
          const content=<><ComponentNavigationIcon name={group.id}/><span>{group.title}</span>{!available&&<small className="sidebar-soon">Soon</small>}{available&&<span className="sidebar-badge" data-new={newCount>0?'New':undefined} data-has-new={newCount>0?'true':undefined} data-count={count}/>}</>;
          return available?<Link key={group.id} href={href} prefetch={false} className={`sidebar-link ${selected?'is-active':''}`} aria-current={selected?'page':undefined} onNavigate={event=>{if(library&&onCollection)event.preventDefault();browse(href,library&&onCollection?()=>onCollection(group.id):undefined);}}>{content}</Link>:<button key={group.id} type="button" className="sidebar-link" disabled>{content}</button>;
        })}</div>)}
      </>:<>
        <span className="sidebar-section-title">Explore</span>
        {exploreItems.map(item => <Link ref={item.name==='Components'?componentsLink:undefined} key={item.name} href={item.href} prefetch={true} aria-current={item.active ? 'page' : undefined} className={`sidebar-link ${item.active ? 'is-active' : ''}`} onNavigate={event => {
          if(item.name==='Components'){focusMenu.current=true;keepMenuOpen.current=open;setComponentsOpen(true);}else setOpen(false);
          selectDestination(item.href);if(item.action){event.preventDefault();item.action();}
        }}><NavigationIcon name={item.icon}/><span>{item.name}</span>{item.name==='Components'&&<ComponentNavigationIcon name="forward" className="sidebar-chevron" size={14}/>}{!!item.count && <small>{item.count}</small>}</Link>)}
        <span className="sidebar-section-title">Resource</span>
        {resourceItems.map(item => <Link key={item.name} href={item.href} prefetch={true} aria-current={item.active ? 'page' : undefined} className={`sidebar-link ${item.active ? 'is-active' : ''}`} onNavigate={() => {
          setOpen(false);selectDestination(item.href);
        }}><NavigationIcon name={item.icon}/><span>{item.name}</span></Link>)}
      </>}</nav>
      {!componentsOpen&&<div className="sidebar-personality"><SidebarArt /></div>}
      <div className="sidebar-tools"><ThemeControl/><ColorPicker /></div>
    </aside>
  </>;
}
