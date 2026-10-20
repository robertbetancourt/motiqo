const {test}=require('node:test');
const assert=require('node:assert/strict');
const compiler=require('typescript-compiler-api');
const pkg=require('../package.json');

test('test transpilation has an explicit JavaScript compiler API independent of the tsc CLI',()=>{
 assert.equal(typeof compiler.transpileModule,'function');
 assert.equal(typeof compiler.ModuleKind.CommonJS,'number');
 assert.equal(pkg.scripts.typecheck,'tsc --noEmit');
 const result=compiler.transpileModule('export const value: number = 42;',{compilerOptions:{module:compiler.ModuleKind.CommonJS}});
 assert.match(result.outputText,/exports.value = 42/);
});
