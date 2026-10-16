import {notFound} from 'next/navigation';
import {elementIds,type ElementId} from '@/registry/element-ids';
import PreviewCapture from '@/components/preview-capture';

export const dynamicParams=false;
export function generateStaticParams(){
  return process.env.NODE_ENV==='development'?elementIds.map(id=>({id})):[];
}

/** Internal asset authoring fixture. Never available in a production build. */
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{theme?:string}>}){
  if(process.env.NODE_ENV!=='development')notFound();
  const {id}=await params,{theme}=await searchParams;
  if(!elementIds.includes(id as ElementId))notFound();
  return <PreviewCapture key={`${id}-${theme}`} id={id as ElementId} theme={theme==='light'?'light':'dark'}/>;
}
