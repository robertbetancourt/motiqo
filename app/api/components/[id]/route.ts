import {componentArchive} from '@/lib/component-zip.server';
import {originalSources,registryItem} from '@/lib/registry.server';
export const runtime='nodejs';
// A per-process workload ceiling; configure Vercel WAF for a distributed IP limit.
let active=0;
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[a-z][a-z0-9-]{0,79}$/.test(id)||!registryItem(id))return Response.json({error:'Unknown component'},{status:404,headers});
 const query=new URL(request.url).searchParams;
 if([...query.keys()].some(key=>!['format','config'].includes(key)||query.getAll(key).length!==1)||
    query.has('format')&&!['source','zip'].includes(query.get('format')!)||
    (query.get('config')?.length??0)>4096||query.get('format')==='source'&&query.has('config')){
  return Response.json({error:'Invalid download parameters'},{status:400,headers});
 }
 if(active>=4)return Response.json({error:'Downloads are busy; retry shortly'},{status:503,headers:{...headers,'Retry-After':'1'}});
 active++;
 try{
  if(query.get('format')==='source'){
   const source=await originalSources([id]);
   return Response.json({files:source[id as keyof typeof source]},{headers});
  }
  const archive=await componentArchive(id,query.get('config'));
  if(!archive)return Response.json({error:'Unknown component'},{status:404,headers});
  return new Response(new Uint8Array(archive),{headers:{...headers,'Content-Type':'application/zip','Content-Disposition':`attachment; filename="motiqo-${id}.zip"`}});
 }catch(error){
  if(error instanceof TypeError)return Response.json({error:'Invalid or unsupported configuration'},{status:400,headers});
  console.error('Component archive failed',error);
  return Response.json({error:'Component download is temporarily unavailable'},{status:500,headers});
 }finally{active--;}
}
