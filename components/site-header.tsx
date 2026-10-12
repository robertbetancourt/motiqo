'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Brand from './brand';
import ColorPicker from './color-picker';
import GitHubControl from './github-control';

function NavIndicator() {
  return <span className="nav-indicator" aria-hidden="true"><span className="nav-beam"/>{Array.from({length:8},(_,i)=><i key={i} style={{left:`${8+i*12}%`,animationDelay:`${i*.27}s`,animationDuration:`${1.6+(i%3)*.35}s`}}/>)}</span>;
}

export default function SiteHeader({ collection=false, savedOnly=false, savedCount=0, onCollection, onSaved }: {
  collection?:boolean; savedOnly?:boolean; savedCount?:number; onCollection?:()=>void; onSaved?:()=>void;
}) {
  const pathname=usePathname();
  const [hash,setHash]=useState('');
  useEffect(()=>{
    const sync=()=>setHash(window.location.hash);
    sync(); window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);
    return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync);};
  },[pathname]);
  const resourcesActive=pathname==='/sponsors'||(pathname==='/docs'&&['#cli','#skills','#accessibility'].includes(hash));
  const docsActive=pathname==='/docs'&&!resourcesActive;
  const collectionActive=(collection||pathname==='/')&&!savedOnly;
  return <header className="site-header"><Link href="/" className="brand cursor-target" aria-label="Motiqo home"><Brand variant="logo" /></Link>
    <nav aria-label="Main navigation">
      {onCollection ? <button className={`cursor-target ${collectionActive ? 'nav-active' : ''}`} onClick={onCollection}>Collection{collectionActive&&<NavIndicator/>}</button> : <Link className={`cursor-target ${collectionActive ? 'nav-active' : ''}`} href="/" aria-current={collectionActive?'page':undefined}>Collection{collectionActive&&<NavIndicator/>}</Link>}
      {onSaved ? <button className={`cursor-target saved-nav ${savedOnly ? 'nav-active' : ''}`} onClick={onSaved}>Saved {savedCount > 0 && <span>{savedCount}</span>}{savedOnly&&<NavIndicator/>}</button> : <Link className="cursor-target saved-nav" href="/?saved=1">Saved</Link>}
      <Link className={`cursor-target ${docsActive?'nav-active':''}`} href="/docs" onClick={()=>setHash('')} aria-current={docsActive?'page':undefined}>Getting started{docsActive&&<NavIndicator/>}</Link>
      <details className="resources-nav"><summary className={`cursor-target ${resourcesActive?'nav-active':''}`}>Resources <ChevronDown size={12}/>{resourcesActive&&<NavIndicator/>}</summary><div className="resources-menu"><Link href="/docs#cli" onClick={e=>{setHash('#cli');e.currentTarget.closest('details')?.removeAttribute('open');}}>CLI <span>Planned</span></Link><Link href="/docs#skills" onClick={e=>{setHash('#skills');e.currentTarget.closest('details')?.removeAttribute('open');}}>Skills <span>Planned</span></Link><Link href="/docs#accessibility" onClick={e=>{setHash('#accessibility');e.currentTarget.closest('details')?.removeAttribute('open');}}>Accessibility</Link><Link href="/sponsors">Sponsorship</Link></div></details>
    </nav>
    <div className="header-tools"><ColorPicker/><GitHubControl/></div>
  </header>;
}
