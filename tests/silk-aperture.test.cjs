const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript-compiler-api');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { JSDOM } = require('jsdom');

const filename = path.resolve(__dirname, '../components/originals/silk-aperture.tsx');
const entry = new Module(filename, module);
entry.filename = filename;
entry.paths = Module._nodeModulePaths(path.dirname(filename));
entry._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  fileName: filename,
}).outputText, filename);
const Silk = entry.exports.default;
function render(props={}) {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Silk, props)));
  return dom.window.document;
}

test('default preview keeps the artwork and central phrase without extra copy or controls', () => {
  const doc = render();
  assert.equal(doc.querySelector('.sa-caption').textContent, 'THE ART OFbeing elsewhere.');
  for (const selector of ['.sa-header', '.sa-orbit', '.sa-side-note', '.sa-footer', 'button']) {
    assert.equal(doc.querySelector(selector), null, selector);
  }
  assert.equal(doc.querySelectorAll('[data-rib]').length, 23);
});

test('external Dawn/Dusk selection controls the drawing without inserting controls into it', () => {
  for (const light of ['dawn', 'dusk']) {
    const doc = render({light});
    assert.equal(doc.querySelector('.silk-aperture').getAttribute('data-light'), light);
    assert.equal(doc.querySelector('.sa-light'), null);
    assert.ok(doc.querySelector('.sa-art'));
  }
});

test('richer standalone content remains available only when explicitly requested', () => {
  const doc = render({minimal:false});
  assert.ok(doc.querySelector('.sa-header'));
  assert.ok(doc.querySelector('.sa-copy'));
  assert.equal(doc.querySelectorAll('.sa-light button').length, 2);
});
