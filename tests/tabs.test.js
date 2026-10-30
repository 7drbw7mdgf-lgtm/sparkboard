import test from 'node:test';
import assert from 'node:assert/strict';
import { closeTab, restoreTabs } from '../src/tab-model.js';

test('open tabs restore in order without deleted boards or duplicate entries', () => {
  assert.deepEqual(restoreTabs(['b', 'missing', 'a', 'b'], ['a', 'b', 'c'], 'c'), ['b', 'a', 'c']);
  assert.deepEqual(restoreTabs(null, ['a', 'b'], 'b'), ['b']);
  assert.deepEqual(restoreTabs([], ['a', 'b'], 'b'), []);
});
test('closing tabs chooses an adjacent board and leaves the board library unchanged', () => {
  const library = ['a', 'b', 'c'];
  assert.deepEqual(closeTab(library, 'b', 'b'), { ids: ['a', 'c'], active: 'c' });
  assert.deepEqual(closeTab(library, 'c', 'c'), { ids: ['a', 'b'], active: 'b' });
  assert.deepEqual(closeTab(library, 'b', 'a'), { ids: ['a', 'c'], active: 'a' });
  assert.deepEqual(library, ['a', 'b', 'c']);
  assert.deepEqual(closeTab(['a'], 'a', 'a'), { ids: [], active: null });
});
