import type { Metadata } from 'next';
import '@fontsource-variable/urbanist';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './globals.css';
import './themes.css';
import InitialPageLoader from '@/components/initial-page-loader';
import AmbientBackground from '@/components/ambient-background';
import SiteShell from '@/components/site-shell';
import ThemeProvider,{themeBootScript} from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'Motiqo — A little motion. A lot of character.',
  description: 'An original library of interactive elements, motion and typography. Explore, adjust and make them your own.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-scroll-behavior="smooth" data-theme="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeBootScript}}/></head><body><AmbientBackground /><InitialPageLoader /><ThemeProvider><SiteShell>{children}</SiteShell></ThemeProvider></body></html>;
}
