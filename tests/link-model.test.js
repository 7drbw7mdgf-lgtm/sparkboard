import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWebAddress } from '../src/link-model.js';

test('link cards accept ordinary website addresses, full URLs and local hosts', () => {
  for (const [input, expected] of [
    ['example.com', 'https://example.com/'],
    [' www.example.com/docs?q=notes#intro ', 'https://www.example.com/docs?q=notes#intro'],
    ['https://example.com/a', 'https://example.com/a'],
    ['http://example.com', 'http://example.com/'],
    ['//example.com/path', 'https://example.com/path'],
    ['localhost:3000', 'https://localhost:3000/'],
    ['example.com:8080/path', 'https://example.com:8080/path'],
  ])
    assert.equal(normalizeWebAddress(input), expected, input);
});
test('link cards reject scripts, credentials, relative paths and malformed addresses', () => {
  for (const input of [
    '',
    'hello',
    '/page',
    'not a website',
    'javascript:alert(1)',
    'data:text/html,hello',
    'file:///etc/passwd',
    'mailto:a@example.com',
    'https://user:secret@example.com',
    'https://',
    'https:example.com',
  ])
    assert.equal(normalizeWebAddress(input), null, input);
});
