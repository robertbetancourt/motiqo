import Library from '@/components/library';
import {originalSources} from '@/lib/registry.server';
export default async function PricingPage({searchParams}:{searchParams:Promise<{element?:string;config?:string;view?:string}>}){
 const params=await searchParams;
 return <Library section="pricing" originalSource={params.element?await originalSources([params.element]):{}} initialElement={params.element} initialConfiguration={params.config} initialView={params.view==='code'||params.view==='prompt'?params.view:'preview'}/>;
}
