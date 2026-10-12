import { ArrowUpRight } from 'lucide-react';
import Brand from '@/components/brand';
import SiteFrame from '@/components/site-frame';

export default function SponsorsPage() {
  return <SiteFrame><div className="sponsor-page"><Brand variant="monogram" className="docs-mark"/><span className="eyebrow">GOOD THINGS GROW IN GOOD COMPANY</span><h1>A small spot.<br/>A shared curiosity.</h1><p>Motiqo is a growing collection of interface elements and motion experiments. Its sponsorship spaces are designed for tools and products that help people create.</p><div className="sponsorship-options"><section><span className="eyebrow">01 / FEATURED PLACEMENT</span><h2>A space with character.</h2><p>A visual card in the collection, with your product identity, a short description and a direct link.</p></section><section><span className="eyebrow">02 / THOUGHTFUL FIT</span><h2>Built for the right company.</h2><p>Developer tools, design products and creative services that complement the collection.</p></section></div><p className="reference-note">Uriat is a local sponsor concept used to explore this card design. Sponsorship spaces are available.</p><a className="primary-button sponsor-contact" href="https://robertbetancourt.vercel.app" target="_blank" rel="noreferrer">Meet Robert & get in touch <ArrowUpRight size={17}/></a></div></SiteFrame>;
}
