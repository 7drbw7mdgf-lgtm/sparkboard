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
