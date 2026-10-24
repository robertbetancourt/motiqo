import {redirect} from 'next/navigation';
import Library from '@/components/library';
import {originalSources} from '@/lib/registry.server';
import {readComponentGroup} from '@/lib/component-groups';

export default async function Page({searchParams}: {searchParams: Promise<{element?: string; saved?: string; config?:string;tag?:string|string[];view?:string|string[];group?:string|string[]}>}) {
  const params = await searchParams;
  const id=params.element==='watt'?'holdings':params.element;
  if(id?.endsWith('-pricing')||id==='cosmos-split-auth'){const query=new URLSearchParams();for(const [key,value] of Object.entries(params))if(typeof value==='string')query.set(key,value);redirect((id==='cosmos-split-auth'?'/login':'/pricing')+'?'+query);}
  const originalSource = id?await originalSources([id]):{};
  return <Library initialView={params.view==='code'||params.view==='prompt'?params.view:'preview'} originalSource={originalSource} initialElement={params.element==='watt'?'holdings':params.element} initialConfiguration={params.config} initialSaved={params.saved === '1'} initialTag={typeof params.tag==='string'?params.tag.slice(0,80):''} initialGroup={readComponentGroup(typeof params.group==='string'?params.group:undefined)} />;
}
