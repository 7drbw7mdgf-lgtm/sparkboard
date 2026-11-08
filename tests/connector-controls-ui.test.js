import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('mindmap child and sibling actions no longer overlap connector ports', () => {
  const source = fs.readFileSync('src/mindmap.js', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');
  assert.match(source, /daughter\.style\.left = left \? '-62px' : 'calc\(100% \+ 62px\)'/);
  assert.match(source, /daughter\.style\.top = '20%'/);
  assert.match(source, /sibling\.style\.left = '26%'/);
  assert.match(source, /sibling\.style\.top = 'calc\(100% \+ 56px\)'/);
  assert.match(source, /data\.mmAddChild|dataset\.mmAddChild/);
  assert.match(css, /#objects\s+\.object\.selected\s*>\s*\.mm-daughter/);
  assert.match(css, /z-index:\s*10\s*;/);
  assert.match(css, /#objects\s+\.object\.selected\s*>\s*\.port/);
  assert.match(css, /z-index:\s*5\s*;/);
  assert.match(css, /#objects\s+\.mm-daughter,\s*#objects\s+\.mm-sibling\s*\{\s*min-width:\s*34px/);
});

test('elbow connector has horizontal/vertical orientation and multiple fine adjustment actions', () => {
  const source = fs.readFileSync('src/connector-edit.js', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');
  for (const action of [
    'elbow-h',
    'elbow-v',
    'left',
    'right',
    'up',
    'down',
    'set',
    'remove',
    'straighten',
  ]) {
    assert.ok(source.includes('data-ca-tool="' + action + '"'), `Missing elbow action ${action}`);
  }
  for (const field of ['ca-bend-index', 'ca-bend-x', 'ca-bend-y', 'ca-bend-step']) {
    assert.ok(source.includes('id="' + field + '"'), `Missing bend field ${field}`);
  }
  assert.match(source, /next\.waypoints = \[p\]/);
  assert.match(source, /current\?\.waypoints \|\| \[\]/);
  assert.match(source, /refreshBendPosition\(\)/);
  assert.match(source, /bendSelector\.addEventListener\('change'/);
  assert.match(source, /stay|Keep precision controls open/);
  assert.match(css, /\.connector-advanced \.ca-bend-editor/);
  assert.match(css, /\.connector-advanced\s+\.ca-primary\s*\{\s*background:\s*#4262ff/);
});
