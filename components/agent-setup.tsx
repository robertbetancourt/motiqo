'use client';

import Link from 'next/link';
import {useId, useRef, useState, type KeyboardEvent} from 'react';
import Brand from './brand';
import styles from './agent-setup.module.css';

const clients = [
  {id:'claude', name:'Claude Code', logo:'claude', docs:'https://code.claude.com/docs/en/mcp'},
  {id:'codex', name:'Codex', logo:'openai', docs:'https://developers.openai.com/codex/mcp'},
  {id:'cursor', name:'Cursor', logo:'cursor', docs:'https://cursor.com/docs/mcp'},
] as const;
const install = 'npm install --save-dev ./motiqo-cli-0.1.0.tgz';
const defaultPath = '/path/to/project/node_modules/@motiqo/cli/bin/motiqo.mjs';

function CodeBlock({text, label}:{text:string;label:string}) {
  const [status,setStatus]=useState('');
  const request=useRef(0);
  async function copy(){
    const current=++request.current;
    try{await navigator.clipboard.writeText(text);if(current===request.current)setStatus('Copied');}
    catch{if(current===request.current)setStatus('Copy failed. Select the code to copy it.');}
  }
  return <div className={styles.codeBlock}>
    <div className={styles.codeHeader}><span>{label}</span><button type="button" onClick={copy} aria-label={`Copy ${label}`}>Copy</button></div>
    <pre tabIndex={0} aria-label={label}><code>{text}</code></pre>
    <span className={styles.copyStatus} role="status">{status}</span>
  </div>;
}

export default function AgentSetup({kind}:{kind:'skill'|'mcp'}) {
  const [selected,setSelected]=useState(0),[cliPath,setCliPath]=useState(defaultPath);
  const tabs=useRef<(HTMLButtonElement|null)[]>([]),id=useId();
  const client=clients[selected],mcp=kind==='mcp';
  const serverPath=cliPath.trim()||defaultPath;
  const quoted=JSON.stringify(serverPath);
  const configuration=client.id==='codex'
    ?`[mcp_servers.motiqo]\ncommand = "node"\nargs = [${quoted}, "mcp"]`
    :JSON.stringify({mcpServers:{motiqo:{type:'stdio',command:'node',args:[serverPath,'mcp']}}},null,2);
  const configFile=client.id==='codex'?'.codex/config.toml':client.id==='cursor'?'.cursor/mcp.json':'.mcp.json';
  const skillPrompt='Read .agents/skills/motiqo/SKILL.md and use the Motiqo workflow to find and install a component. Show me the dry-run before installing.';
  function navigateTabs(event:KeyboardEvent<HTMLButtonElement>){
    let next=selected;
    if(event.key==='ArrowRight')next=(selected+1)%clients.length;
    else if(event.key==='ArrowLeft')next=(selected+clients.length-1)%clients.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=clients.length-1;
    else return;
    event.preventDefault();setSelected(next);tabs.current[next]?.focus();
  }
  return <div className={`${styles.page} ${mcp?styles.mcp:styles.skill}`} data-setup={kind}>
    <header className={styles.hero}>
      <div className={styles.marks}><Brand variant="isotype"/><span aria-hidden="true">/</span><img className={!mcp&&client.logo==='claude'?styles.claude:styles.logo} src={`/brands/${mcp?'modelcontextprotocol':client.logo}.svg`} width="34" height="34" alt={mcp?'Model Context Protocol':client.name}/></div>
      <span className={styles.eyebrow}>{mcp?'MODEL CONTEXT PROTOCOL':'FOR YOUR WORKFLOW'}</span>
      <h1>{mcp?<>The catalog,{' '}<br/>connected.</>:<>The Motiqo{' '}<br/>skill.</>}</h1>
      <p>{mcp?'Component discovery, props and source. One connection to your agent.':'Find the right component. Make it part of your project.'}</p>
      {!mcp&&<span className={styles.skillPath}>.agents / skills / motiqo</span>}
    </header>
    <div className={styles.setup}>
    <div className={styles.tabs} role="tablist" aria-label={`${mcp?'MCP':'Skill'} client`}>
      {clients.map((item,index)=><button key={item.id} ref={node=>{tabs.current[index]=node;}} id={`${id}-${item.id}`} role="tab" aria-selected={selected===index} aria-controls={`${id}-panel`} tabIndex={selected===index?0:-1} onClick={()=>setSelected(index)} onKeyDown={navigateTabs}><img className={item.logo==='claude'?styles.claude:styles.logo} src={`/brands/${item.logo}.svg`} alt="" width="18" height="18"/>{item.name}</button>)}
    </div>
    <section id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${client.id}`} tabIndex={0} className={styles.panel}>
      <div className={styles.step}><span className={styles.stepNumber}>01</span><div><h2>Install the CLI</h2><p><a href="/downloads/motiqo-cli-0.1.0.tgz" download>Download the package</a>, move it into your project, then run:</p><CodeBlock text={install} label="Install CLI"/><p className={styles.note}>Local package · Node.js 20+ · No account required</p></div></div>
      <div className={styles.step}><span className={styles.stepNumber}>02</span><div><h2>{mcp?`Connect ${client.name}`:'Add the skill'}</h2>
        {mcp?<><p>Add this configuration to <code>{configFile}</code> in your project. Merge it with existing servers.</p><label className={styles.pathLabel} htmlFor={`${id}-path`}>Absolute path to the installed CLI</label><input id={`${id}-path`} className={styles.pathInput} value={cliPath} onChange={event=>setCliPath(event.target.value)} spellCheck={false}/><CodeBlock key={configuration} text={configuration} label={configFile}/><p className={styles.note}>Replace the example path with your actual path. Use forward slashes on Windows. Restart your client and enable Motiqo{client.id==='claude'?' when prompted to approve the project server':''}.</p><a className={styles.textLink} href={client.docs} target="_blank" rel="noreferrer">{client.name} MCP guide ↗</a></>:<><p>Run this from the root of your project.</p><CodeBlock text="npx motiqo skill" label="Install skill"/><p className={styles.note}>Creates <code>.agents/skills/motiqo/SKILL.md</code>. Your existing files are protected.</p></>}
      </div></div>
      <div className={styles.step}><span className={styles.stepNumber}>03</span><div><h2>{mcp?'Try it out':`Start in ${client.name}`}</h2><p>{mcp?'Ask your agent to inspect the catalog.':'Give your agent the skill path explicitly, so it can follow the workflow.'}</p><CodeBlock key={`${kind}-${client.id}-prompt`} text={mcp?'Find Motiqo components with motion effects. Show me their props and source before choosing one.':skillPrompt} label="First prompt"/>{mcp&&<p className={styles.note}>Tools: <code>list_components</code>, <code>get_component</code>, <code>get_component_source</code>. Installation uses the CLI after a dry-run.</p>}</div></div>
    </section>
    </div>
    <footer className={styles.footer}><Link href={mcp?'/skill':'/mcp'}>{mcp?'Set up the skill':'Connect MCP'} ↗</Link><Link href="/docs">Read the docs ↗</Link></footer>
  </div>;
}
