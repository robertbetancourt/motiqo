import type { Metadata } from 'next';
import '@fontsource-variable/urbanist';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './globals.css';
import InitialPageLoader from '@/components/initial-page-loader';
import AmbientBackground from '@/components/ambient-background';

export const metadata: Metadata = {
  title: 'Motiqo — A little motion. A lot of character.',
  description: 'An independent collection of interactive elements, motion and typography. Explore original Motiqo components and reference demos.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-scroll-behavior="smooth"><body><AmbientBackground /><InitialPageLoader />{children}</body></html>;
}
