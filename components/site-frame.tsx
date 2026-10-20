'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { SidebarProps } from './site-sidebar';
import { useSiteNavigation } from './site-shell';
import SiteFooter from './site-footer';

type Props = SidebarProps & { children: ReactNode; paused?: boolean; workspace?: boolean; };

export default function SiteFrame({children, paused=false, workspace=false, ...navigation}: Props) {
  const publish=useSiteNavigation(),actions=useRef(navigation);actions.current=navigation;
  const {collection,savedOnly,savedCount}=navigation;
  useLayoutEffect(()=>{
    publish({collection,savedOnly,savedCount,onCollection:collection?(group)=>actions.current.onCollection?.(group):undefined,onSaved:collection?()=>actions.current.onSaved?.():undefined});
  },[publish,collection,savedOnly,savedCount]);
  useLayoutEffect(()=>()=>publish({}),[publish]);
  return <>
    <div className={`site-shell ${paused?'motion-paused':''} ${workspace?'workspace-shell':''}`}><main className="section-transition">{children}</main>{!workspace&&<SiteFooter/>}</div>
  </>;
}
