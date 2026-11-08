import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SAI_COMMIT, replaceRequired } from '../scripts/build-sai.cjs';

test('Sai source revision is pinned and build has no credential injection', () => {
  assert.match(SAI_COMMIT, /^[a-f0-9]{40}$/);
  const build = fs.readFileSync('scripts/build-sai.cjs', 'utf8');
  assert.match(build, /HostedAIPanel/);
  assert.match(build, /GEMINI_API_KEY: ''/);
  assert.match(build, /API_KEY: ''/);
  assert.match(build, /--base', '\/sai\//);
  assert.match(build, /HostedPersistence/);
  assert.match(build, /TASK_BRIDGE_CHANNEL/);
  assert.match(build, /indexRef/);
  assert.match(build, /From Sparkboard/);
  assert.match(build, /aria-label="Back to Sparkboard"/);
  assert.match(build, /href="\/\?workspace=1"/);
});

test('Benchline uses a focused home view and consistent simplified navigation', () => {
  const build = fs.readFileSync('scripts/build-sai.cjs', 'utf8');
  const home = fs.readFileSync('integration/sai/HostedHomeScreen.tsx', 'utf8');
  const sidebar = fs.readFileSync('integration/sai/HostedSidebar.tsx', 'utf8');
  const header = fs.readFileSync('integration/sai/HostedHeader.tsx', 'utf8');
  const mobile = fs.readFileSync('integration/sai/HostedMobileShell.tsx', 'utf8');
  for (const name of ['HostedHomeScreen', 'HostedSidebar', 'HostedHeader']) {
    assert.match(build, new RegExp(name));
  }
  assert.match(home, /Next tasks/);
  assert.match(home, /Next meeting/);
  assert.match(home, /From Sparkboard/);
  assert.doesNotMatch(
    home,
    /PriorityBreakdownWidget|ProjectHealthWidget|MyTasksWidget|RecentActivityWidget/,
  );
  assert.match(sidebar, /More views/);
  assert.match(sidebar, /New task/);
  assert.match(header, /Download project backup/);
  assert.match(header, /global-search-bar/);
  assert.match(mobile, /Kanban board/);
  assert.match(mobile, /benchline-search-open/);
});

test('hosted Kanban and Gantt stay readable and task assignee UI is removed', () => {
  const build = fs.readFileSync('scripts/build-sai.cjs', 'utf8');
  const patch = fs.readFileSync('scripts/patch-sai-planner.cjs', 'utf8');
  const theme = fs.readFileSync('integration/sai/HostedMobileShell.tsx', 'utf8');
  assert.match(build, /patchHostedPlanner\(source\)/);
  assert.match(patch, /KanbanView\.tsx/);
  assert.match(patch, /KanbanCard\.tsx/);
  assert.match(patch, /AddTaskModal\.tsx/);
  assert.match(patch, /TaskDetailPanel\.tsx/);
  assert.match(patch, /TasksView\.tsx/);
  assert.match(patch, /TaskSidebar\.tsx/);
  assert.match(patch, /showTaskList/);
  assert.match(patch, /fitEntireProject/);
  assert.match(patch, /assignedTo: \[\]/);
  assert.match(theme, /benchline-kanban-track/);
  assert.match(theme, /scroll-snap-type:x mandatory/);
  assert.match(theme, /benchline-gantt-actions/);
  assert.match(theme, /benchline-kanban-filters/);
  // Historical assignee metadata is not erased from persisted user tasks.
  assert.doesNotMatch(patch, /task\.assignedTo\s*=|delete task\.assignedTo/);
});

test('Benchline Gantt uses selectable calendar scales and touch-friendly date editing', () => {
  const build = fs.readFileSync('scripts/build-sai.cjs', 'utf8');
  const patch = fs.readFileSync('scripts/patch-sai-gantt.cjs', 'utf8');
  const controls = fs.readFileSync('integration/sai/HostedViewControls.tsx', 'utf8');
  const styles = fs.readFileSync('integration/sai/HostedMobileShell.tsx', 'utf8');
  assert.match(build, /patchHostedGantt\(source\)/);
  for (const scale of ['day', 'week', 'month', 'quarter', 'year']) {
    assert.ok(controls.includes(`value: '${scale}'`), `Missing scale ${scale}`);
  }
  assert.match(controls, /<select/);
  assert.match(controls, /Time scale/);
  assert.match(controls, /Zoom timeline in/);
  assert.match(controls, /MIN_ZOOM = 0\.25/);
  assert.match(patch, /ganttViewMode === 'year'/);
  assert.match(patch, /ganttViewMode === 'quarter'/);
  assert.match(patch, /React\.PointerEvent/);
  assert.match(patch, /pointercancel/);
  assert.match(patch, /ArrowRight/);
  assert.match(patch, /showDetails/);
  assert.match(styles, /benchline-gantt-date-row/);
  assert.match(styles, /touch-action:none/);
});

test('Sai sources are served as an isolated subpath without duplicating authentication', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /href="\/sai\/"/);
  assert.match(html, /id="sai-link"|class="sai-workspace-link"/);
  assert.match(html, /class="sai-mobile-link"/);
  assert.match(html, /Benchline projects remain local/);
  assert.match(html, />Benchline<\/a>/);
  assert.match(html, /Meet Benchline/);
  assert.match(html, /Open Benchline project planner/);
  assert.doesNotMatch(html, />Sai planner/);
  // Keep the hosted route intact until a separate Benchline destination is supplied.
  assert.match(html, /href="\/sai\/"/);
  const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
  const deploy = fs.readFileSync('.github/workflows/deploy-website.yml', 'utf8');
  assert.match(ci, /npm run sai:build/);
  assert.match(deploy, /npm run sai:build/);
  assert.match(deploy, /REQUIRE_SAI: '1'/);
});

test('staging patches fail closed if upstream Sai layout changes', () => {
  const dir = fs.mkdtempSync('/tmp/sai-build-patch-');
  const file = dir + '/App.tsx';
  try {
    fs.writeFileSync(file, 'import App from "./App";');
    assert.throws(() => replaceRequired(file, 'import AIAssistantPanel', ''), /source changed/);
    assert.equal(fs.readFileSync(file, 'utf8'), 'import App from "./App";');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
