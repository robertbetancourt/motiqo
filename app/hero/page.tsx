import HeroPrompts from '@/components/hero-prompts';

export const metadata = {
  title: 'Hero prompts — Motiqo',
  description: 'Complete prompts for creating a responsive hero section in your project.'
};

export default async function HeroPage({searchParams}:{searchParams:Promise<{hero?:string;view?:string}>}) {
  const params=await searchParams;
  return <HeroPrompts initialHero={params.hero} initialView={params.view==='prompt'?'prompt':'preview'} />;
}
