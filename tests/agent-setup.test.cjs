const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react'),{JSDOM}=require('jsdom');
function load(){const filename=path.resolve(__dirname,'../components/agent-setup.tsx'),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=id=>id==='next/link'?{default:({children,...props})=>React.createElement('a',props,children)}:id==='./brand'?{default:()=>React.createElement('svg')}:id.endsWith('.css')?{default:{}}:normal(id);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return entry.exports.default;}
async function setup(run){const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true}),previous=new Map();for(const[k,v]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,IS_REACT_ACT_ENVIRONMENT:true})){previous.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}const root=require('react-dom/client').createRoot(document.getElementById('mount'));try{await run({root,dom,Component:load()});}finally{await React.act(()=>root.unmount());dom.window.close();for(const[k,v]of previous){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}}

test('MCP client tabs support keyboard navigation and copy the configuration for the chosen host',()=>setup(async({root,dom,Component})=>{
 let copied='',fail=false;Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(fail)throw Error('denied');copied=text;}}});
 await React.act(()=>root.render(React.createElement(Component,{kind:'mcp'})));
 const tabs=[...document.querySelectorAll('[role=tab]')],panel=document.querySelector('[role=tabpanel]');
 assert.equal(tabs[0].getAttribute('aria-selected'),'true');assert.match(panel.textContent,/\.mcp.json/);assert.equal(document.querySelectorAll('[role=tab] img[src$=".svg"]').length,3);
 await React.act(()=>tabs[0].dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));
 assert.equal(document.activeElement,tabs[1]);assert.equal(tabs[1].tabIndex,0);assert.equal(tabs[0].tabIndex,-1);assert.equal(panel.getAttribute('aria-labelledby'),tabs[1].id);assert.match(panel.textContent,/\[mcp_servers.motiqo\]/);
 await React.act(async()=>{document.querySelector('[aria-label="Copy .codex/config.toml"]').click();await Promise.resolve();});assert.match(copied,/command = "node"/);assert.match(panel.textContent,/Copied/);
 await React.act(()=>tabs[1].dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'End',bubbles:true})));
 const json=document.querySelector('pre[aria-label=".cursor/mcp.json"]').textContent;assert.deepEqual(JSON.parse(json).mcpServers.motiqo.args,['/path/to/project/node_modules/@motiqo/cli/bin/motiqo.mjs','mcp']);assert.equal(document.activeElement,tabs[2]);
 fail=true;await React.act(async()=>{document.querySelector('[aria-label="Copy .cursor/mcp.json"]').click();await Promise.resolve();});assert.match(panel.textContent,/Copy failed/);
 await React.act(()=>tabs[2].dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));assert.equal(document.activeElement,tabs[0]);
}));

test('Skill setup uses the local installer and gives every client an explicit portable skill path',()=>setup(async({root,Component})=>{
 await React.act(()=>root.render(React.createElement(Component,{kind:'skill'})));
 assert.equal(document.querySelector('[data-setup]').dataset.setup,'skill');assert.equal(document.querySelector('nav'),null,'resource navigation belongs to the sidebar');
 assert.match(document.querySelector('pre[aria-label="Install CLI"]').textContent,/npm install --save-dev \.\/motiqo-cli-0\.1\.0\.tgz/);
 assert.equal(document.querySelector('pre[aria-label="Install skill"]').textContent,'npx motiqo skill');
 for(const tab of document.querySelectorAll('[role=tab]')){await React.act(()=>tab.click());assert.ok(document.body.textContent.includes('Start in '+tab.textContent));assert.match(document.querySelector('pre[aria-label="First prompt"]').textContent,/Read \.agents\/skills\/motiqo\/SKILL\.md/);}
 assert.equal(document.querySelector('a[download]').getAttribute('href'),'/downloads/motiqo-cli-0.1.0.tgz');
}));
