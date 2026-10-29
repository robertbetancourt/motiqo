const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process'),readline=require('node:readline');

test('MCP official SDK client negotiates stdio, discovers the schema and receives validated results',{timeout:20000},async()=>{
 const {Client}=await import('@modelcontextprotocol/client'),{StdioClientTransport}=await import('@modelcontextprotocol/client/stdio');
 const client=new Client({name:'motiqo-sdk-test',version:'1.0.0'}),transport=new StdioClientTransport({command:process.execPath,args:[path.resolve(__dirname,'../packages/cli/bin/motiqo.mjs'),'mcp'],stderr:'pipe'});
 try{await client.connect(transport);const{tools}=await client.listTools();assert.equal(tools.length,3);assert.ok(tools.every(tool=>tool.inputSchema.type==='object'));
  const result=await client.callTool({name:'get_component',arguments:{id:'elastic-showcase'}});assert.equal(result.isError,undefined);assert.equal(JSON.parse(result.content[0].text).id,'elastic-showcase');
  const invalid=await client.callTool({name:'get_component',arguments:{id:'../../.env'}});assert.equal(invalid.isError,true);
 }finally{await client.close();}
});

test('MCP stdio discovers and reads catalog sources, rejects invalid inputs, and exposes no mutation tools', {timeout:20000}, async()=>{
 const child=spawn(process.execPath,[path.resolve(__dirname,'../packages/cli/bin/motiqo.mjs'),'mcp'],{stdio:['pipe','pipe','pipe']});
 const pending=new Map();let counter=0,stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
 const lines=readline.createInterface({input:child.stdout});
 lines.on('line',line=>{try{const message=JSON.parse(line);if(message.id!==undefined){const waiter=pending.get(message.id);pending.delete(message.id);waiter?.resolve(message);}}catch(error){for(const waiter of pending.values())waiter.reject(error);}});
 child.on('exit',code=>{for(const waiter of pending.values())waiter.reject(Error(`MCP exited ${code}: ${stderr}`));});
 const send=(method,params)=>new Promise((resolve,reject)=>{const id=++counter;pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
 try{
  const init=await send('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'motiqo-test',version:'1.0.0'}});
  assert.equal(init.result.serverInfo.name,'motiqo');
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  const list=await send('tools/list',{});assert.equal(list.result.tools.length,3);assert.ok(list.result.tools.every(tool=>tool.annotations.readOnlyHint&&!tool.annotations.openWorldHint));
  const call=async(name,args)=>(await send('tools/call',{name,arguments:args}));
  const all=await call('list_components',{});assert.equal(JSON.parse(all.result.content[0].text).length,require('../registry/manifest.json').items.filter(i=>i.visibility!=='draft').length);
  const info=await call('get_component',{id:'radial-spectrum'});const metadata=JSON.parse(info.result.content[0].text);assert.ok(metadata.controls.length);assert.ok(!metadata.files.some(file=>'content'in file));
  const src=await call('get_component_source',{id:'radial-spectrum',file:'components/originals/radial-spectrum.tsx'});assert.match(JSON.parse(src.result.content[0].text).content,/RadialSpectrum/);
  for(const args of [{id:'../secret'},{id:'radial-spectrum',extra:'unexpected'}]){const invalid=await call('get_component',args);assert.ok(invalid.error||invalid.result.isError);}
  const missing=await call('get_component',{id:'missing'});assert.equal(missing.result.isError,true);
  const escape=await call('get_component_source',{id:'radial-spectrum',file:'../../.env'});assert.equal(escape.result.isError,true);assert.doesNotMatch(escape.result.content[0].text,/SECRET|TOKEN/);
  const unknown=await call('install_component',{id:'gyro'});assert.ok(unknown.error||unknown.result.isError);
  const ping=await send('ping',{});assert.deepEqual(ping.result,{});
 }finally{lines.close();child.stdin.end();child.kill();}
});
