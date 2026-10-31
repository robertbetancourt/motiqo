const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('Every catalog entry has real content-addressed MP4 clips in both themes',async()=>{
 const manifest=require('../registry/manifest.json'),videos=require('../registry/preview-videos.json'),{previewRevisions}=await import('../scripts/preview-revisions.mjs'),revisions=previewRevisions();
 assert.deepEqual(Object.keys(videos.items).sort(),manifest.items.map(item=>item.id).sort());
 for(const {id} of manifest.items){assert.equal(videos.items[id].sourceHash,revisions[id]);for(const theme of ['dark','light']){
  const url=videos.items[id][theme];assert.match(url,new RegExp('^/previews/videos/'+id+'-'+theme+'-[a-f0-9]{12}\\.mp4$'));
  const bytes=fs.readFileSync(path.resolve(__dirname,'../public'+url)),hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12);assert.ok(url.endsWith('-'+hash+'.mp4'));assert.equal(bytes.toString('ascii',4,8),'ftyp');assert.ok(bytes.length>1000);
 }}
});
