import BrandLoader from '@/components/brand-loader';

// Next.js owns this fallback and removes it as soon as the route is ready.
export default function Loading() {
  return <BrandLoader route />;
}
