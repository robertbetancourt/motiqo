import {notFound} from 'next/navigation';
import {elementIds,type ElementId} from '@/registry/element-ids';
import PreviewCapture from '@/components/preview-capture';

// Newly registered components must be capturable without restarting next dev.
// Page still rejects every production request before resolving an id.
export const dynamicParams=true;
export function generateStaticParams(){
  return process.env.NODE_ENV==='development'?elementIds.map(id=>({id})):[];
}

/** Internal asset authoring fixture. Never available in a production build. */
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{theme?:string;motion?:string}>}){
  if(process.env.NODE_ENV!=='development')notFound();
  const {id}=await params,{theme,motion}=await searchParams;
  if(!elementIds.includes(id as ElementId))notFound();
  return <PreviewCapture key={`${id}-${theme}-${motion}`} id={id as ElementId} theme={theme==='light'?'light':'dark'} motion={motion==='1'}/>;
}
