'use strict';
/** Additional direct controls for the hosted Benchline task list. */
const fs = require('node:fs');
const path = require('node:path');
const { swap } = require('./patch-sai-gantt.cjs');

function patchHostedControls(root) {
  const file = path.join(root, 'components', 'TasksView.tsx');
  let s = fs.readFileSync(file, 'utf8');
  s = swap(s,
    '                                    <th scope="col" className="px-2 py-3 border-b border-gray-200 dark:border-gray-700 w-6"></th>',
    '                                    <th scope="col" className="benchline-task-actions-cell px-2 py-3 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500">Actions</th>');
  s = swap(s,
    '                                                <td className="px-2 py-2.5"></td>',
    [
      '                                                <td className="benchline-task-actions-cell px-2 py-2.5">',
      '                                                    <div className="benchline-task-row-actions">',
      '                                                        <button type="button" aria-label={task.completion === 100 ? "Reopen task" : "Complete task"} title={task.completion === 100 ? "Reopen task" : "Mark complete"} onClick={() => onSetData(previous => previous ? { ...previous, tasks: previous.tasks.map(item => item.id === task.id ? { ...item, completion: item.completion === 100 ? 0 : 100 } : item) } : previous)}>{task.completion === 100 ? "↶" : "✓"}</button>',
      '                                                        <button type="button" aria-label={"Edit " + task.name} title="Edit task details and dates" onClick={() => onRequestEditTask(task.id)}>Edit</button>',
      '                                                    </div>',
      '                                                </td>',
    ].join('\n'));
  // Preserve the desktop sortable table, but render readable task cards on
  // compact screens. All dates, group, priority, progress, tags, notes and
  // custom fields belong to their task; editing still uses the existing panel.
  const mobileCards = [
    '                    <section className="benchline-mobile-tasks" aria-label="Tasks as cards">',
    '                        <div className="benchline-mobile-tasks-heading">',
    '                            <h2>Tasks <span>{sortedTasksForList.length}</span></h2>',
    '                            <label>Sort <select aria-label="Sort mobile tasks" value={listSortConfig?.key || "priority"} onChange={event => setListSortConfig({ key: event.target.value, direction: "ascending" })}>',
    '                                <option value="priority">Priority</option><option value="endDate">Due date</option><option value="startDate">Start date</option><option value="name">Name</option><option value="progress">Progress</option>',
    '                            </select></label>',
    '                        </div>',
    '                        <div className="benchline-mobile-task-grid">',
    '                            {sortedTasksForList.map(task => {',
    '                                const taskAssignments = (assignmentsByTaskId[task.id] || []).slice().sort((a,b) => a.startDate.getTime() - b.startDate.getTime());',
    '                                const completed = task.completion === 100;',
    '                                const group = groups.find(item => item.id === task.groupId);',
    '                                const formatDate = (date: Date) => new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });',
    '                                const customValues = customFields.filter(field => task.customFieldValues?.[field.id] != null && String(task.customFieldValues[field.id]).trim() !== "");',
    '                                return (',
    '                                    <article className="benchline-mobile-task-card" key={task.id} style={{ "--benchline-task-accent": task.color || "#4262ff" } as React.CSSProperties}>',
    '                                        <div className="benchline-mobile-task-head">',
    '                                            <span className="benchline-mobile-task-accent" aria-hidden="true" />',
    '                                            <div className="benchline-mobile-task-heading"><h3>{task.name}</h3>{group && <span>{group.name}</span>}</div>',
    '                                            <span className={"benchline-mobile-task-status" + (completed ? " is-complete" : "")}>{completed ? "Complete" : task.completion ? "In progress" : "To do"}</span>',
    '                                        </div>',
    '                                        <dl className="benchline-mobile-task-details">',
    '                                            <div><dt>Start</dt><dd>{formatDate(task.startDate)}</dd></div>',
    '                                            <div><dt>Due</dt><dd>{formatDate(task.endDate)}</dd></div>',
    '                                            <div><dt>Priority</dt><dd>{task.priority || "Not set"}</dd></div>',
    '                                            <div><dt>Progress</dt><dd>{task.completion}%</dd></div>',
    '                                        </dl>',
    '                                        <div className="benchline-mobile-task-progress" role="progressbar" aria-label={"Progress for " + task.name} aria-valuenow={task.completion} aria-valuemin={0} aria-valuemax={100}><span style={{ width: task.completion + "%" }} /></div>',
    '                                        {!!task.notes?.trim() && <p className="benchline-mobile-task-notes">{task.notes}</p>}',
    '                                        {!!task.tags?.length && <div className="benchline-mobile-task-tags" aria-label="Task tags">{task.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}',
    '                                        {!!customValues.length && <dl className="benchline-mobile-task-extras">{customValues.map(field => <div key={field.id}><dt>{field.name}</dt><dd>{String(task.customFieldValues?.[field.id])}</dd></div>)}</dl>}',
    '                                        {!!taskAssignments.length && <details className="benchline-mobile-task-assignments"><summary>{taskAssignments.length} {taskAssignments.length === 1 ? "subtask" : "subtasks"}</summary><ul>{taskAssignments.map(assignment => <li key={assignment.id}><span>{assignment.name}</span><span>{assignment.completed ? "Done" : formatDate(assignment.endDate)}</span></li>)}</ul></details>}',
    '                                        <div className="benchline-mobile-task-actions">',
    '                                            <button type="button" className="benchline-mobile-task-edit" onClick={() => onRequestEditTask(task.id)} aria-label={"Edit " + task.name}>Edit details</button>',
    '                                            <button type="button" className="benchline-mobile-task-complete" onClick={() => onSetData(previous => previous ? { ...previous, tasks: previous.tasks.map(item => item.id === task.id ? { ...item, completion: item.completion === 100 ? 0 : 100 } : item) } : previous)} aria-label={completed ? "Reopen " + task.name : "Complete " + task.name}>{completed ? "Reopen" : "Mark complete"}</button>',
    '                                        </div>',
    '                                    </article>',
    '                                );',
    '                            })}',
    '                        </div>',
    '                    </section>',
  ].join('\\n');
  s = swap(s,
    '                        <table className="min-w-full text-left border-separate border-spacing-0">',
    mobileCards + '\\n                        <table className="benchline-desktop-task-table min-w-full text-left border-separate border-spacing-0">');
  s = swap(s,
    '                 <header className="flex-shrink-0 h-12 flex justify-end items-center px-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">',
    '                 <header className="benchline-tasks-desktop-toolbar flex-shrink-0 h-12 flex justify-end items-center px-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">');
  fs.writeFileSync(file, s);

  // Keep touch interactions consistent with Sparkboard: explicit actions,
  // rather than requiring a precise click on the card title.
  const kanbanFile = path.join(root, 'components', 'KanbanCard.tsx');
  let card = fs.readFileSync(kanbanFile, 'utf8');
  card = swap(card,
    '            {/* Tags (if any) */}',
    [
      '            <button type="button" className="benchline-kanban-edit-action" aria-label={"Edit " + task.name} onClick={(event) => { event.stopPropagation(); onEdit(task.id); }}>Edit task</button>',
      '            {/* Tags (if any) */}',
    ].join('\n'));
  fs.writeFileSync(kanbanFile, card);
}
module.exports = { patchHostedControls };
