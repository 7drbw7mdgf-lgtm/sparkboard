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

test('Benchline Calendar matches Sparkboard styling and has usable period dropdown', () => {
  const build = fs.readFileSync('scripts/build-sai.cjs', 'utf8');
  const adapter = fs.readFileSync('scripts/patch-sai-calendar.cjs', 'utf8');
  const overview = fs.readFileSync('integration/sai/HostedCalendarOverview.tsx', 'utf8');
  const mobile = fs.readFileSync('integration/sai/HostedMobileShell.tsx', 'utf8');
  const header = fs.readFileSync('integration/sai/HostedHeader.tsx', 'utf8');

  assert.match(build, /patchHostedCalendar\(source\)/);
  for (const view of ['day', '3day', 'week', 'month', 'quarter', 'year']) {
    assert.ok(adapter.includes(`<option value="${view}">`), `Missing calendar view ${view}`);
  }
  assert.match(adapter, /benchline-calendar-view/);
  assert.match(adapter, /benchline-calendar-jump/);
  assert.match(adapter, /benchline-calendar-source-option/);
  assert.match(adapter, /benchline-calendar-week-scroll/);
  assert.match(adapter, /benchline-calendar-view'/);
  assert.match(adapter, /Monday first/);
  assert.match(overview, /onChooseMonth/);
  assert.match(overview, /onChooseDay/);
  assert.match(overview, /monthData/);
  assert.match(overview, /from '\.\.\/types'/);
  assert.match(mobile, /--benchline-primary:#4262ff/);
  assert.match(mobile, /benchline-calendar-month-panel/);
  assert.match(mobile, /benchline-calendar-week-scroll/);
  assert.match(header, /benchline-app-header/);
  assert.match(mobile, /header\.benchline-app-header/);
  assert.doesNotMatch(adapter, /delete meeting\.date|delete task\.startDate/);
});

test('Benchline exposes Sparkboard-style direct task commands on desktop and mobile', () => {
  const build = fs.readFileSync('scripts/build-sai.cjs', 'utf8');
  const header = fs.readFileSync('integration/sai/HostedHeader.tsx', 'utf8');
  const mobile = fs.readFileSync('integration/sai/HostedMobileShell.tsx', 'utf8');
  const edit = fs.readFileSync('scripts/patch-sai-controls.cjs', 'utf8');
  const handoff = fs.readFileSync('integration/sai/HostedPersistence.ts', 'utf8');
  assert.match(build, /patchHostedControls\(source\)/);
  assert.match(build, /onAddTask=\{/);
  assert.match(build, /canUndo=\{canUndo\}/);
  assert.match(header, /benchline-top-actions/);
  assert.match(header, /handleShortcuts/);
  assert.match(header, /destinations\[Number\(event\.key\) - 1\]/);
  assert.match(header, /onHelp/);
  assert.match(header, /onAddTask/);
  assert.match(mobile, /bpc-command-row/);
  assert.match(mobile, /benchline-task-row-actions/);
  assert.match(mobile, /benchline-kanban-edit-action/);
  assert.match(edit, /Reopen task/);
  assert.match(edit, /Edit task/);
  assert.match(edit, /KanbanCard\.tsx/);
  assert.match(handoff, /TASK_BRIDGE_RECEIPT_KEY/);
  assert.match(handoff, /imported\.size/);
});

test('Benchline consistently uses Sparkboard visual tokens including installed app', () => {
  const theme = fs.readFileSync('integration/sai/HostedTheme.ts', 'utf8');
  const shell = fs.readFileSync('integration/sai/HostedMobileShell.tsx', 'utf8');
  const build = fs.readFileSync('scripts/build-sai.cjs', 'utf8');
  const manifest = JSON.parse(fs.readFileSync('integration/sai/manifest.webmanifest', 'utf8'));
  const icon = fs.readFileSync('integration/sai/icon.svg', 'utf8');
  for (const color of ['#4262ff', '#ffffff', '#e6e6e2', '#292c31']) {
    assert.ok(theme.includes(color), `Missing shared colour ${color}`);
  }
  for (const view of [
    'benchline-overview',
    'benchline-kanban',
    'benchline-calendar',
    'benchline-gantt',
    'animate-slide-in-right',
  ]) {
    assert.ok(theme.includes(view), `Missing shared styling for ${view}`);
  }
  assert.match(shell, /import \{ hostedThemeCss \} from '\.\/HostedTheme'/);
  assert.match(shell, /themeCss \+ hostedThemeCss/);
  assert.match(build, /'HostedTheme\.ts'/);
  assert.match(build, /theme-color.*#4262ff/);
  assert.equal(manifest.theme_color, '#4262ff');
  assert.equal(manifest.background_color, '#ffffff');
  assert.match(icon, /#4262ff/);
  assert.doesNotMatch(icon, /#243f30|#ef754e/);
});

test('Benchline uses a white workspace, movable Gantt bars and compact planner menus', () => {
  const theme = fs.readFileSync('integration/sai/HostedTheme.ts', 'utf8');
  const gantt = fs.readFileSync('scripts/patch-sai-gantt.cjs', 'utf8');
  const calendar = fs.readFileSync('scripts/patch-sai-calendar.cjs', 'utf8');
  assert.match(theme, /--benchline-page:#ffffff/);
  assert.match(theme, /benchline-gantt-toolbar/);
  assert.match(theme, /benchline-gantt-task-bar/);
  assert.match(theme, /benchline-calendar-more-panel/);
  assert.match(theme, /touch-action:none!important/);
  assert.match(gantt, /barDragStart/);
  assert.match(gantt, /window\.addEventListener/);
  assert.match(gantt, /benchline-gantt-more/);
  assert.match(gantt, /Jump to today/);
  assert.match(calendar, /benchline-calendar-more/);
  assert.match(calendar, /More calendar options/);
  assert.match(calendar, /Calendar settings/);
  assert.match(calendar, /Jump to date/);
});

test('mobile Tasks view uses full-information cards without affecting the desktop table', () => {
  const controls = fs.readFileSync('scripts/patch-sai-controls.cjs', 'utf8');
  const css = fs.readFileSync('integration/sai/HostedTheme.ts', 'utf8');
  assert.match(controls, /benchline-mobile-task-card/);
  assert.match(controls, /benchline-desktop-task-table/);
  assert.match(controls, /sortedTasksForList\.map\(task/);
  for (const field of [
    'task.startDate',
    'task.endDate',
    'task.priority',
    'task.completion',
    'task.notes',
    'task.tags',
    'task.customFieldValues',
    'taskAssignments',
    'group.name',
  ]) {
    assert.ok(controls.includes(field), 'Missing mobile task detail: ' + field);
  }
  assert.match(controls, /onRequestEditTask\(task.id\)/);
  assert.match(controls, /Mark complete/);
  assert.match(controls, /Reopen/);
  assert.match(css, /body\.benchline-phone #root \.benchline-mobile-tasks/);
  assert.match(css, /body\.benchline-phone #root \.benchline-desktop-task-table/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
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
