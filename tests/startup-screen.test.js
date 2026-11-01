import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowStartup } from '../src/startup-screen.js';

test('new anonymous visitors see the startup sign-in screen', () => {
  assert.equal(shouldShowStartup(false, false), true);
});

test('signed-in visitors enter their workspace directly', () => {
  assert.equal(shouldShowStartup(true, false), false);
});

test('guest choice is remembered for the current browser tab', () => {
  assert.equal(shouldShowStartup(false, true), false);
});

test('signed-in visitors bypass the startup screen regardless of guest choice', () => {
  assert.equal(shouldShowStartup(true, true), false);
});
