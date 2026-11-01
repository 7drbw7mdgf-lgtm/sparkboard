import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPanel } from '../src/format-panel.js';
import { objectStyle, shapeSvg } from '../src/rendering.js';

const note = (id = 'note') => ({
  id,
  type: 'sticky',
  x: 10,
  y: 20,
  w: 320,
  h: 240,
  text: 'Next steps',
  color: '#f8df87',
  stroke: '#26964e',
});

test('Format has five contextual, non-duplicated groups for a sticky', () => {
  const html = formatPanel([note()]);
  for (const heading of ['Appearance', 'Text', 'Layout', 'Arrange', 'Actions']) {
    assert.equal(html.split('>' + heading + '</h4>').length - 1, 1, heading);
  }
  for (const cmd of ['duplicate', 'delete', 'lock', 'front', 'back']) {
    assert.equal(html.split('data-command="' + cmd + '"').length - 1, 1, cmd);
  }
  assert.equal(html.split('data-prop="color"').length - 1, 1, 'fill once');
  assert.equal(html.split('data-prop="textColor"').length - 1, 1, 'text colour once');
  assert.match(html, /data-prop="cornerRadius"/);
  assert.doesNotMatch(html, /data-command="edit-link"/);
});

test('Connector shows route, caps, line style and label but not sticky formatting', () => {
  const html = formatPanel([
    { id: 'a', type: 'connector', from: 'x', to: 'y', color: '#123456', strokeWidth: 3 },
  ]);
  assert.match(html, /data-prop="avoidObstacles"/);
  assert.match(html, /data-prop="endArrow"/);
  assert.match(html, /data-prop="text"/);
  assert.doesNotMatch(html, /data-prop="cornerRadius"/);
  assert.doesNotMatch(html, /data-prop="fontFamily"/);
  assert.doesNotMatch(html, /data-prop="opacity"/);
});

test('Mixed selection shows shared controls and only one alignment group', () => {
  const html = formatPanel([note(), { ...note('two'), type: 'shape' }]);
  assert.match(html, /data-align="middle"/);
  assert.equal(html.split('data-align="left"').length - 1, 1);
  assert.doesNotMatch(html, /data-prop="w"/);
  assert.doesNotMatch(html, /data-prop="cornerRadius"/);
});

test('Locked item retains unlock but disables destructive actions', () => {
  const html = formatPanel([{ ...note(), locked: true }]);
  assert.match(html, /data-command="lock"/);
  assert.match(html, /data-command="delete" disabled/);
});

test('Canvas style uses saved opacity, typography and corner radius', () => {
  const css = objectStyle({
    ...note(),
    opacity: 0.5,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    textDecoration: 'underline',
    cornerRadius: 20,
  });
  assert.match(css, /opacity:0\.5/);
  assert.match(css, /font-family:Georgia/);
  assert.match(css, /font-style:italic/);
  assert.match(css, /text-decoration:underline/);
  assert.match(css, /border-radius:20px/);
  assert.match(shapeSvg({ ...note(), type: 'shape', cornerRadius: 30 }), /rx="12\.5"/);
});
