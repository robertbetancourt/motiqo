import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const {port}=reservation.address();await new Promise(resolve=>reservation.close(resolve));
const server=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe'],shell:false});
let log='';for(const stream of [server.stdout,server.stderr])stream.on('data',chunk=>{log=(log+chunk).slice(-4000);});
let spawnError;server.on('error',error=>{spawnError=error;});
const url=`http://127.0.0.1:${port}`;
try{
 let ready=false;
 for(let i=0;i<80;i++){
  if(spawnError)throw spawnError;if(server.exitCode!==null)throw Error(`Production server exited: ${log}`);
  try{ready=(await fetch(url+'/docs',{signal:AbortSignal.timeout(1000)})).ok;}catch{}
  if(ready)break;await new Promise(resolve=>setTimeout(resolve,250));
 }
 if(!ready)throw Error(`Production server did not become ready: ${log}`);
 const check=spawn(process.execPath,[path.join(root,'scripts/verify-http.mjs'),url],{cwd:root,stdio:'inherit',shell:false});
 const [code]=await once(check,'exit');if(code!==0)throw Error('Production HTTP verification failed.');
}finally{
 if(server.exitCode===null){const stopped=once(server,'exit');server.kill();await Promise.race([stopped,new Promise(resolve=>setTimeout(resolve,5000).unref())]);if(server.exitCode===null)server.kill('SIGKILL');}
}
