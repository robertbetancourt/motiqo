import type { NextConfig } from 'next';
import * as registry from './registry/manifest.json';
// These files are read at runtime for Source and ZIP downloads.
const exportFiles=[...new Set(registry.items.flatMap(item=>item.files.map(file=>`./${file.source}`)))];
const config: NextConfig = { poweredByHeader: false, devIndicators: false,
  outputFileTracingIncludes:{'/library':exportFiles,'/api/components/*':exportFiles},
  async headers(){return[{source:'/previews/:path*',headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]}];},
};
export default config;
