import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEmbed } from '../src/embed-model.js';
import { validateBoard } from '../board-model.js';

test('video links generate canonical players without arbitrary iframe content', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=jNQXAC9IVRw&t=3',
    'https://youtu.be/jNQXAC9IVRw',
    'https://youtube.com/shorts/jNQXAC9IVRw',
  ]) {
    assert.equal(
      resolveEmbed('video', url).url,
      'https://www.youtube-nocookie.com/embed/jNQXAC9IVRw',
    );
  }
  assert.equal(
    resolveEmbed('video', 'https://vimeo.com/76979871').url,
    'https://player.vimeo.com/video/76979871',
  );
  for (const url of [
    'javascript:alert(1)',
    '<iframe src="https://evil.test"></iframe>',
    'https://youtube.com.evil.test/watch?v=jNQXAC9IVRw',
    'https://youtube.com@evil.test/watch?v=jNQXAC9IVRw',
    'https://user:pass@youtube.com/watch?v=jNQXAC9IVRw',
    'http://youtu.be/jNQXAC9IVRw',
    'https://youtu.be/bad',
  ])
    assert.equal(resolveEmbed('video', url), null);
});
test('map searches are encoded and PDFs require direct HTTPS files', () => {
  assert.equal(
    new URL(resolveEmbed('map', 'London, UK & nearby').url).searchParams.get('q'),
    'London, UK & nearby',
  );
  assert.equal(resolveEmbed('map', 'https://evil.test'), null);
  assert.equal(
    new URL(
      resolveEmbed('map', 'https://www.google.com/maps/search/?api=1&query=London').url,
    ).searchParams.get('q'),
    'London',
  );
  assert.equal(resolveEmbed('map', 'https://maps.app.goo.gl/anything'), null);
  assert.equal(resolveEmbed('pdf', 'https://example.com/document.pdf?download=1').kind, 'pdf');
  for (const url of [
    'http://example.com/file.pdf',
    'data:application/pdf;base64,AA==',
    'https://example.com/page.html',
    'https://example.com:444/file.pdf',
  ])
    assert.equal(resolveEmbed('pdf', url), null);
});
test('portable board validation preserves embeds and rejects unsafe imports', () => {
  const board = {
    objects: [
      {
        id: 'embed-1',
        type: 'embed',
        x: 0,
        y: 0,
        w: 480,
        h: 340,
        text: 'A place',
        embedKind: 'map',
        url: 'London, UK',
      },
    ],
  };
  assert.deepEqual(validateBoard(board), board);
  board.objects[0].embedKind = 'video';
  board.objects[0].url = 'https://evil.test/player';
  assert.throws(() => validateBoard(board), /Invalid embed/);
});
