import Link from 'next/link';
import SiteFrame from '@/components/site-frame';

export default function DocsPage(){return <SiteFrame><div className="docs-layout">
<aside className="docs-nav"><span className="eyebrow">GETTING STARTED</span>{['Overview','Installation','Usage','Skill','Prompts','Motion'].map(section=><a key={section} href={`#${section.toLowerCase()}`}>{section}</a>)}</aside>
<article className="docs-content"><span className="eyebrow">SMALL DETAILS. REAL MOTION.</span><h1 id="overview">Getting started.</h1>
<p>Choose an element, tune its mood and bring the complete component into your React project.</p>
<section id="installation"><h2>01 — Bring it into your project.</h2>
<p>Open an element and choose Download component. The ZIP includes its implementation, companion files, artwork, dependency list and an example with your selected settings. Copy components into your source tree and public assets into your public directory.</p>
<p>For repeat installations, <a href="/downloads/motiqo-cli-0.1.0.tgz" download>download the Motiqo CLI</a>. Move the downloaded archive into your React project folder, then run:</p>
<pre className="docs-snippet"><code>{`npm install --save-dev ./motiqo-cli-0.1.0.tgz
npx motiqo list
npx motiqo add luma --dir src/components/motiqo --dry-run
npx motiqo add luma --dir src/components/motiqo`}</code></pre>
<p>The installer bundles all files and works offline after installation. It reports missing dependencies and protects existing files. Add <code>--install</code> to explicitly install missing packages with npm, with lifecycle scripts disabled. With pnpm, yarn or bun, install the listed dependencies using your own manager. Use <code>--overwrite</code> only after reviewing a conflict.</p>
<p>This is a downloadable package; it has not been published to the npm registry. React 19 is tested. WebGL components require a browser with the appropriate graphics support.</p></section>
<section id="usage"><h2>02 — Find the right mood.</h2>
<p>Mood presets set a coherent combination of supported properties. Fine-tune individual controls, or choose Reset settings to return to defaults. Configurations are saved locally per component, including when you revisit from Saved.</p>
<p>Share configuration copies a link that restores your settings. Download component and Copy prompt use the same configuration. Source lets you inspect individual implementation files.</p>
<pre className="docs-snippet"><code>{`import Luma from './components/motiqo/luma';

export default function Example() {
  return <div style={{ height: 560 }}><Luma speed={0.7} /></div>;
}`}</code></pre>
<p>Give canvas components a parent with a defined height. Styles are scoped and included; Tailwind and the Motiqo website stylesheet are optional. Keep companion files together and preserve artwork paths.</p></section>
<section id="skill"><h2>03 — Work with your agent.</h2><pre className="docs-snippet"><code>npx motiqo skill</code></pre>
<p>This installs the Motiqo skill at <code>.agents/skills/motiqo/SKILL.md</code> in your project. It guides compatible coding agents through discovery, dry-run installation, configuration and validation. It does not configure an MCP server.</p></section>
<section id="prompts"><h2>04 — Or start with a prompt.</h2><p>Copy prompt includes behavior, dependencies, selected properties and an import example. Choose an assistant with the adjacent arrow and supply the downloaded files so it can integrate the real implementation.</p><p>Preserve source attribution when an element uses an adapted engine. New artwork changes its visual identity; engine authorship remains credited.</p></section>
<section id="motion"><h2>Motion with room for everyone.</h2><p>Components respect reduced motion and suspend animation when offscreen. The <code>paused</code> prop freezes motion. Reduced motion keeps keyboard inspection available for data components.</p><p>Aura exposes its score and risk semantically. Holdings announces selected positions. Pulse and Sentiment include data tables and keyboard inspection with meaningful, limited announcements. Sample values are illustrative. Provide your own labels and data when integrating a real product.</p><p>Test keyboard controls, contrast, touch and your actual layout before shipping. Automated checks cover behavior, exports and the installer; testing with assistive technology remains part of product validation.</p></section>
<Link className="primary-button" href="/library">Explore Library →</Link></article></div></SiteFrame>;}
