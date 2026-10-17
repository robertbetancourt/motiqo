import type { NextConfig } from 'next';
import * as registry from './registry/manifest.json';
const exportFiles=[...new Set(registry.items.flatMap(item=>item.files.map(file=>`./${file.source}`))),'./LICENSE','./THIRD_PARTY_NOTICES.md'];
const config: NextConfig = {poweredByHeader:false,devIndicators:false,
 outputFileTracingIncludes:{'/library':exportFiles,'/api/components/*':exportFiles},
 async headers(){return [
  {source:'/:path*',headers:[
   {key:'X-Content-Type-Options',value:'nosniff'},
   {key:'X-Frame-Options',value:'SAMEORIGIN'},
   {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
   {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
   {key:'Content-Security-Policy',value:"base-uri 'self'; object-src 'none'; frame-ancestors 'self'"},
  ]},
  {source:'/previews/:path*',headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]},
 ];},
};
export default config;
