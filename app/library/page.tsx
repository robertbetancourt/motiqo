import Library from '@/components/library';
import {originalSources} from '@/lib/registry.server';

export default async function Page({searchParams}: {searchParams: Promise<{element?: string; saved?: string; config?:string;tag?:string|string[];view?:string|string[]}>}) {
  const params = await searchParams;
  const id=params.element==='watt'?'holdings':params.element;
  const originalSource = id?await originalSources([id]):{};
  return <Library initialView={params.view==='code'||params.view==='prompt'?params.view:'preview'} originalSource={originalSource} initialElement={params.element==='watt'?'holdings':params.element} initialConfiguration={params.config} initialSaved={params.saved === '1'} initialTag={typeof params.tag==='string'?params.tag.slice(0,80):''} />;
}
