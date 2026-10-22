import {notFound} from 'next/navigation';
import {findHero} from '@/lib/heroes';
import HeroCapture from '@/components/heroes/hero-capture';
export default async function HeroPreviewPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{still?:string}>}){
 const {id}=await params,query=await searchParams,hero=findHero(id);if(!hero)notFound();
 return <HeroCapture id={hero.id} paused={query.still==='1'}/>;
}
