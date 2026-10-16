import {deflateRawSync} from 'node:zlib';
import {componentBundle} from './registry.server';
import {decodeSettings,defaultsFor,usageFor} from './element-controls';
import type {ElementId,LibraryElement} from './catalog';

export function crc32(bytes:Uint8Array){
  let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
/** Deterministic ZIP: DEFLATE, UTF-8 names, no filesystem paths from callers. */
export function zipFiles(files:{name:string;bytes:Buffer}[]){
  const local:Buffer[]=[],central:Buffer[]=[];let offset=0;
  const names=new Set<string>();
  for(const file of files){
    if(!file.name||file.name.includes('\\')||file.name.startsWith('/')||file.name.split('/').some(part=>!part||part==='.'||part==='..')||names.has(file.name))throw Error('Unsafe or duplicate archive path');
    names.add(file.name);
    const name=Buffer.from(file.name),data=deflateRawSync(file.bytes),crc=crc32(file.bytes),header=Buffer.alloc(30),directory=Buffer.alloc(46);
    header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);
    header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(file.bytes.length,22);header.writeUInt16LE(name.length,26);
    directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(0x800,8);directory.writeUInt16LE(8,10);directory.writeUInt16LE(33,14);
    directory.writeUInt32LE(crc,16);directory.writeUInt32LE(data.length,20);directory.writeUInt32LE(file.bytes.length,24);directory.writeUInt16LE(name.length,28);directory.writeUInt32LE(offset,42);
    local.push(header,name,data);central.push(directory,name);offset+=header.length+name.length+data.length;
  }
  const end=Buffer.alloc(22),directory=Buffer.concat(central);
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,end]);
}
export async function componentArchive(id:string,raw:string|null){
  const bundle=await componentBundle(id);if(!bundle)return null;
  const settings=raw===null?defaultsFor(id as ElementId):decodeSettings(id as ElementId,raw);
  if(!settings)throw new TypeError('Invalid or unsupported configuration');
  const item=bundle as unknown as LibraryElement;
  const example=usageFor(item,settings).replace(/from '\.\//g,"from './components/motiqo/");
  const dependencies=Object.entries(bundle.packageDependencies).map(([name,version])=>`${name}@${version}`).join(' ');
  const devDependencies=Object.entries(bundle.devDependencies).map(([name,version])=>`${name}@${version}`).join(' ');
  const readme=`# ${bundle.title}\n\nReact component from Motiqo, registry ${bundle.version}.\n\nCopy components/ into your React source tree and public/ into the public asset directory. Keep companion files together. Import the entry from Example.tsx; its example includes your chosen settings. Provide a parent with an explicit height for canvas components. Styles are scoped; Tailwind is optional.\n\n${dependencies?`Runtime dependencies: npm install ${dependencies}\n`:''}${devDependencies?`Type dependencies: npm install --save-dev ${devDependencies}\n`:''}\nReact is supplied by your application. This archive does not replace your package.json.\n\nRespect reduced motion and provide meaningful text/data alternatives for charts. Values shown by Motiqo demos are illustrative.\n\nSource: ${bundle.source}\n${bundle.sourceUrl}\nPreserve existing source credits. Distribution terms are not yet published.\n`;
  return zipFiles([
    ...bundle.files.map(file=>({name:file.target,bytes:Buffer.from(file.content,file.encoding as BufferEncoding)})),
    {name:'Example.tsx',bytes:Buffer.from(example)},
    {name:'README.md',bytes:Buffer.from(readme)},
    {name:'motiqo.json',bytes:Buffer.from(JSON.stringify({schemaVersion:1,id,version:bundle.version,settings,dependencies:bundle.packageDependencies,devDependencies:bundle.devDependencies},null,2))},
  ]);
}
