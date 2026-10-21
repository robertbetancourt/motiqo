// Low-concurrency checks against a local production server; not a load test.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=new URL(process.argv[2]??'http://127.0.0.1:3040');
if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname))throw Error('This check is for a local production server, not third-party endpoints.');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'registry/manifest.json'),'utf8'));
const crc32=bytes=>{let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;};
const get=relative=>fetch(new URL(relative,base),{signal:AbortSignal.timeout(30000)});
const records=[];
for(const item of manifest.items){
 const response=await get(`/api/components/${item.id}`);assert.equal(response.status,200,item.id);assert.match(response.headers.get('content-type'),/application\/zip/);assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 const bytes=Buffer.from(await response.arrayBuffer()),names=new Set(),allowed=new Set([...item.files.map(file=>file.target),'LICENSE','THIRD_PARTY_NOTICES.md','README.md','Example.tsx','motiqo.json']);let offset=0;
 while(bytes.readUInt32LE(offset)===0x04034b50){
  const size=bytes.readUInt32LE(offset+18),length=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28),name=bytes.subarray(offset+30,offset+30+length).toString(),start=offset+30+length+extra;
  assert.ok(allowed.has(name),`${item.id}: unexpected public file ${name}`);assert.ok(!names.has(name));names.add(name);
  const content=inflateRawSync(bytes.subarray(start,start+size));assert.equal(content.length,bytes.readUInt32LE(offset+22));assert.equal(crc32(content),bytes.readUInt32LE(offset+14));offset=start+size;
 }
 assert.equal(bytes.readUInt32LE(offset),0x02014b50);assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);assert.equal(names.size,allowed.size);
 records.push({id:item.id,bytes:bytes.length,files:names.size});
}
for(const[route,status]of [['/api/components/missing',404],['/api/components/gyro?format=no',400],['/api/components/gyro?config=bad',400],['/api/components/gyro?format=source&format=zip',400],['/api/components/gyro?other=x',400]])assert.equal((await get(route)).status,status,route);
// Next returns HTTP 200 for streamed not-found pages. Check the denial content too.
const capture=await get('/preview-capture/gyro'),denied=await capture.text();assert.ok([200,404].includes(capture.status));assert.ok(denied.includes('This page could not be found'));assert.ok(denied.includes('noindex'));assert.ok(!denied.includes('data-testid="poster-surface"'));
const page=await get('/docs');assert.equal(page.status,200);assert.equal(page.headers.get('x-content-type-options'),'nosniff');assert.equal(page.headers.get('x-frame-options'),'SAMEORIGIN');assert.match(page.headers.get('content-security-policy'),/object-src 'none'/);
console.log(JSON.stringify({base:base.origin,archives:records.length,totalBytes:records.reduce((total,item)=>total+item.bytes,0),crcAndPaths:'passed',invalidRequests:'passed',productionCaptureRoute:'not exposed',headers:'baseline present; CSP is partial',records},null,2));
