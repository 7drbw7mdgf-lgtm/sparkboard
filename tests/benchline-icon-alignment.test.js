import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Benchline uses a single fixed-size icon system across navigation and menus', () => {
  const icons = fs.readFileSync('integration/sai/HostedIcon.tsx', 'utf8');
  const sidebar = fs.readFileSync('integration/sai/HostedSidebar.tsx', 'utf8');
  const header = fs.readFileSync('integration/sai/HostedHeader.tsx', 'utf8');
  const mobile = fs.readFileSync('integration/sai/HostedMobileShell.tsx', 'utf8');
  const theme = fs.readFileSync('integration/sai/HostedTheme.ts', 'utf8');
  const build = fs.readFileSync('scripts/build-sai.cjs', 'utf8');

  assert.match(icons, /viewBox="0 0 24 24"/);
  assert.match(icons, /strokeWidth="1.8"/);
  assert.match(icons, /size = 18/);
  for (const name of ['home', 'tasks', 'timeline', 'calendar', 'kanban', 'undo', 'redo', 'menu']) {
    assert.ok(icons.includes(name), 'Missing icon ' + name);
  }
  assert.match(sidebar, /HostedIcon name=\{item.symbol as BenchlineIconName\}/);
  assert.match(header, /HostedIcon name="search"/);
  assert.match(header, /HostedIcon name="chevron-down"/);
  assert.match(mobile, /HostedIcon name="menu"/);
  assert.match(mobile, /HostedIcon name="kanban"/);
  assert.match(theme, /#root \.benchline-icon/);
  assert.match(mobile, /#benchline-phone-chrome \.benchline-icon/);
  assert.match(build, /'HostedIcon\.tsx'/);
});
