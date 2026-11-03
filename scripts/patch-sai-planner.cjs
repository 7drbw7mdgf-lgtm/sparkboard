'use strict';
/**
 * Presentation-only simplification for Benchline's pinned, hosted source.
 * Runs after the upstream Gantt/task-detail compatibility patches.
 * Do not mutate historical assignee fields in saved user projects.
 */
const fs = require('node:fs');
const path = require('node:path');

function once(root, file, needle, replacement) {
  const name = path.join(root, 'components', file);
  const original = fs.readFileSync(name, 'utf8');
  if (original.split(needle).length !== 2)
    throw Error('Planner patch anchor missing or duplicated: ' + file + ' / ' + needle.slice(0, 75));
  fs.writeFileSync(name, original.replace(needle, replacement));
}

function removeUntil(root, file, start, end) {
  const name = path.join(root, 'components', file);
  const original = fs.readFileSync(name, 'utf8');
  const first = original.indexOf(start);
  if (first < 0 || original.indexOf(start, first + start.length) >= 0)
    throw Error('Planner patch start missing or ambiguous: ' + file + ' / ' + start.slice(0, 75));
  const last = original.indexOf(end, first + start.length);
  if (last < 0) throw Error('Planner patch end missing: ' + file + ' / ' + end.slice(0, 75));
  fs.writeFileSync(name, original.slice(0, first) + original.slice(last));
}

function patchHostedPlanner(root) {
  // Task creation and editing: no assignment picker or unassigned avatar row.
  removeUntil(root, 'AddTaskModal.tsx',
    '                    <div>\n                        <MetadataRow icon={<UserCircleIcon className="w-5 h-5"/>} label="Assignees"',
    '                    <div>\n                        <MetadataRow icon={<CalendarDaysIcon className="w-5 h-5"/>} label="Start date"');
  once(root, 'AddTaskModal.tsx', 'endDate, assignedTo, color, completion: 0',
    'endDate, assignedTo: [], color, completion: 0');

  removeUntil(root, 'TaskDetailPanel.tsx',
    '                    <MetadataRow icon={<UserCircleIcon className="w-5 h-5"/>} label="Assignees">',
    '                     <MetadataRow icon={<CalendarDaysIcon className="w-5 h-5"/>} label="Start date">');
  removeUntil(root, 'TaskDetailPanel.tsx',
    '                                <div className="relative flex-1" ref={assignmentAssigneePickerRef}>',
    '                                <button onClick={handleAddAssignment}');
  once(root, 'TaskDetailPanel.tsx', 'assignedTo: newAssignmentAssignees,', 'assignedTo: [],');

  // No assignee column, including in the user-selectable list columns.
  once(root, 'TasksView.tsx',
    "['assignees', 'endDate', 'priority', 'progress', 'tags']",
    "['endDate', 'priority', 'progress', 'tags']");
  removeUntil(root, 'TasksView.tsx',
    "        assignees: { title: 'Assignees', render: task => {",
    "        startDate: { title: 'Start Date'");
  once(root, 'TasksView.tsx',
    "type SortableListKey = 'name' | 'assignees' |", "type SortableListKey = 'name' |");

  // Kanban: no assignee filter, uniform legible columns, advanced filters tucked away.
  once(root, 'KanbanView.tsx',
    "    const [assigneeFilter, setAssigneeFilter] = useState<string>('all');\n", '');
  removeUntil(root, 'KanbanView.tsx',
    "            if (assigneeFilter !== 'all') {",
    "            if (groupFilter !== 'all'");
  once(root, 'KanbanView.tsx',
    'priorityFilter, assigneeFilter, groupFilter', 'priorityFilter, groupFilter');
  removeUntil(root, 'KanbanView.tsx',
    '                        {/* Assignee Dropdown */}',
    '                        {/* Group Dropdown */}');
  once(root, 'KanbanView.tsx',
    'Personal Workspace / Board View', 'Tasks');
  once(root, 'KanbanView.tsx',
    'Kanban Sprint Board', 'Board');
  once(root, 'KanbanView.tsx',
    '<div className="h-full flex flex-col overflow-hidden spark-canvas-grid text-[#292c31] dark:text-gray-100 font-sans">',
    '<div className="benchline-kanban h-full flex flex-col overflow-hidden bg-[#fafaf8] text-[#292c31] dark:bg-gray-950 dark:text-gray-100 font-sans">');
  once(root, 'KanbanView.tsx', '                        {/* Priority Dropdown */}',
    '                        <details className="benchline-kanban-filters"><summary>Filters</summary><div className="benchline-kanban-filter-fields">\n                        {/* Priority Dropdown */}');
  once(root, 'KanbanView.tsx', '                        {/* New Task Button */}',
    '                        </div></details>\n                        {/* New Task Button */}');
  removeUntil(root, 'KanbanView.tsx',
    '                        {/* New Task Button */}',
    '                    </div>\n                </div>\n            </div>');
  once(root, 'KanbanView.tsx',
    '            {/* Kanban Columns Canvas */}',
    '            <p className="benchline-kanban-hint">Swipe between columns · use the arrows on a card to change its status.</p>\n            {/* Kanban Columns Canvas */}');
  once(root, 'KanbanView.tsx',
    '<div className="flex-1 overflow-x-auto overflow-y-hidden p-6">',
    '<div className="benchline-kanban-track flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-4">');
  once(root, 'KanbanView.tsx',
    '<div className="flex gap-6 h-full items-start min-w-[1080px]">',
    '<div className="benchline-kanban-columns flex h-full min-w-0 items-start gap-4">');
  once(root, 'KanbanView.tsx',
    'className={' + String.fromCharCode(96) + 'w-80 flex-shrink-0 flex flex-col max-h-full rounded-2xl border transition-all duration-200 ',
    'className={' + String.fromCharCode(96) + 'benchline-kanban-column w-[min(290px,calc(100vw-40px))] flex-shrink-0 flex flex-col max-h-full rounded-xl border transition-all duration-200 ');
  once(root, 'KanbanView.tsx',
    '<div className="p-3 border-t border-[#e6e6e2]/60 dark:border-gray-800/60">',
    '<div className="benchline-kanban-bottom-add p-3 border-t border-[#e6e6e2]/60 dark:border-gray-800/60">');

  // Card layout: no avatars, consistent backgrounds, larger touch move targets.
  removeUntil(root, 'KanbanCard.tsx',
    '                {/* Assignees */}',
    '            </div>\n        </div>\n    );');
  once(root, 'KanbanCard.tsx',
    'className={' + String.fromCharCode(96) + 'group relative rounded-xl border p-4',
    'className={' + String.fromCharCode(96) + 'benchline-kanban-card group relative rounded-xl border p-4');
  once(root, 'KanbanCard.tsx',
    'className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5',
    'className="benchline-kanban-move flex items-center gap-0.5');
  once(root, 'KanbanCard.tsx',
    'task.tags.map((tag, idx)', 'task.tags.slice(0, 2).map((tag, idx)');
  once(root, 'KanbanCard.tsx',
    'className="p-1 hover:bg-[#f0efeb] dark:hover:bg-gray-700 rounded text-gray-500',
    'className="min-h-8 min-w-8 hover:bg-[#f0efeb] dark:hover:bg-gray-700 rounded text-gray-500');
  // One forward/backward button each. Both now large enough to tap.
  once(root, 'KanbanCard.tsx',
    'className="p-1 hover:bg-[#f0efeb] dark:hover:bg-gray-700 rounded text-gray-500',
    'className="min-h-8 min-w-8 hover:bg-[#f0efeb] dark:hover:bg-gray-700 rounded text-gray-500');

  // Gantt sidebar: task dates and priorities remain; avatars are not shown.
  removeUntil(root, 'TaskSidebar.tsx',
    '                                            <div className="flex items-center -space-x-1.5">',
    '                                            <div className="flex items-center gap-1.5 text-[10px]');
  removeUntil(root, 'TaskSidebar.tsx',
    '                                    <div className="flex items-center gap-4 pr-4">',
    '                                </div>\n                            );');

  // Gantt: free up timeline space, default to full-width chart on phones,
  // show Today and Fit even on compact screens, let the user reveal the task list.
  once(root, 'GanttChart.tsx', 'const DEFAULT_SIDEBAR_WIDTH = 400;', 'const DEFAULT_SIDEBAR_WIDTH = 300;');
  once(root, 'GanttChart.tsx',
    '    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);',
    '    const [showTaskList, setShowTaskList] = useState(() => typeof window === "undefined" || !window.matchMedia("(max-width: 650px), (max-height: 500px) and (pointer: coarse)").matches);\n    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);');
  once(root, 'GanttChart.tsx',
    '<div className="flex h-full bg-white dark:bg-gray-900 relative overflow-hidden font-sans">',
    '<div className="benchline-gantt flex h-full min-w-0 bg-white dark:bg-gray-900 relative overflow-hidden font-sans">');
  once(root, 'GanttChart.tsx',
    '            <TaskSidebar \n',
    '            {showTaskList && <TaskSidebar \n');
  once(root, 'GanttChart.tsx',
    '                onAddTask={onRequestAddTask}\n            />',
    '                onAddTask={onRequestAddTask}\n            />}');
  once(root, 'GanttChart.tsx',
    '            {/* Adjustable Splitter Divider */}\n            <div',
    '            {/* Adjustable Splitter Divider */}\n            {showTaskList && <div');
  once(root, 'GanttChart.tsx',
    '            <div className="flex-1 flex flex-col min-w-0 relative">',
    '            <div className="flex-1 flex flex-col min-w-0 relative">');
  once(root, 'GanttChart.tsx',
    '            </div>\n\n            <div className="flex-1 flex flex-col min-w-0 relative">',
    '            </div>}\n\n            <div className="flex-1 flex flex-col min-w-0 relative">');
  once(root, 'GanttChart.tsx',
    '    const handleScrollToToday = () => {',
    '    const fitEntireProject = () => {\n        const days = Math.max(1, diffInDays(projectStartDate, projectEndDate) + 1);\n        const viewport = timelineScrollRef.current;\n        if (!viewport) return;\n        setCurrentZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.floor((viewport.clientWidth - 12) / days))));\n        viewport.scrollLeft = 0;\n    };\n\n    const handleScrollToToday = () => {');
  once(root, 'GanttChart.tsx',
    '<h2 className="text-sm font-bold text-[#292c31] dark:text-gray-100 font-[\'Manrope\']">Roadmap Timeline</h2>',
    '<h2 className="text-sm font-bold text-[#292c31] dark:text-gray-100 font-[\'Manrope\']">Timeline</h2>');
  once(root, 'GanttChart.tsx',
    '                    <div className="flex items-center gap-2.5">\n                        <button\n                            onClick={handleScrollToToday}',
    '                    <div className="benchline-gantt-actions flex items-center gap-2.5">\n                        <button type="button" onClick={() => setShowTaskList(value => !value)} className="benchline-gantt-toggle" aria-pressed={showTaskList}>{showTaskList ? "Hide tasks" : "Show tasks"}</button>\n                        <button type="button" onClick={fitEntireProject} className="benchline-gantt-fit">Fit</button>\n                        <button\n                            onClick={handleScrollToToday}');
  once(root, 'GanttChart.tsx',
    'className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-xl',
    'className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-xl');
  // The global new task action is already in Benchline's sidebar/phone chrome.
  removeUntil(root, 'GanttChart.tsx',
    '                        <button\n                            onClick={onRequestAddTask}',
    '                    </div>\n                </div>\n                {dependencyLink && (');
}

module.exports = { patchHostedPlanner, once, removeUntil };
