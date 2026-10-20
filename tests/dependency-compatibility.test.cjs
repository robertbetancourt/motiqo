const {test}=require('node:test');
const assert=require('node:assert/strict');
const pkg=require('../package.json');
const lock=require('../package-lock.json');

test('React and React DOM use the same declared and installed runtime version',()=>{
 assert.equal(pkg.dependencies.react,pkg.dependencies['react-dom']);
 assert.equal(lock.packages['node_modules/react'].version,lock.packages['node_modules/react-dom'].version);
 assert.equal(require('react').version,require('react-dom').version);
});
