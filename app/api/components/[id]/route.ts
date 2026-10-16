import {componentArchive} from '@/lib/component-zip.server';
import {originalSources,registryItem} from '@/lib/registry.server';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  try{
    if(new URL(request.url).searchParams.get('format')==='source'){
      if(!registryItem(id))return Response.json({error:'Unknown component'},{status:404});
      const source=await originalSources([id]);
      return Response.json({files:source[id as keyof typeof source]},{headers:{'Cache-Control':'no-store'}});
    }
    const archive=await componentArchive(id,new URL(request.url).searchParams.get('config'));
    if(!archive)return Response.json({error:'Unknown component'},{status:404});
    return new Response(new Uint8Array(archive),{headers:{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="motiqo-${id}.zip"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }catch(error){
    if(error instanceof TypeError)return Response.json({error:error.message},{status:400});
    console.error('Component archive failed',error);
    return Response.json({error:'Component download is temporarily unavailable'},{status:500});
  }
}
