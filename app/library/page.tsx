import Library from '@/components/library';
import {originalSources} from '@/lib/registry.server';

export default async function Page({searchParams}: {searchParams: Promise<{element?: string; saved?: string; config?:string}>}) {
  const params = await searchParams;
  const id=params.element==='watt'?'holdings':params.element;
  const originalSource = id?await originalSources([id]):{};
  return <Library originalSource={originalSource} initialElement={params.element==='watt'?'holdings':params.element} initialConfiguration={params.config} initialSaved={params.saved === '1'} />;
}
