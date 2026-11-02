/**
 * Same-origin task handoff to the hosted Sai/Benchline planner.
 * This is intentionally not account/cloud synchronisation: both apps must be opened at
 * sparkboard.co.uk in the same browser profile. Tasks stay queued until persisted by Sai.
 */
export const TASK_BRIDGE_KEY = 'sparkboard.sai.task-creation.v1';

export function readTaskQueue(storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    const items = JSON.parse(target.getItem(TASK_BRIDGE_KEY) || '[]');
    return Array.isArray(items) ? items.filter((item) =>
      item && typeof item.id === 'string' && typeof item.name === 'string'
    ) : [];
  } catch {
    return [];
  }
}

export function publishTask(task, storage) {
  if (!task || typeof task.id !== 'string' || !task.id || !String(task.name || '').trim())
    throw Error('A task requires an ID and title.');
  try {
    const target = storage ?? globalThis.localStorage;
    const queued = readTaskQueue(target);
    if (!queued.some((item) => item.id === task.id)) {
      queued.push({
        id: task.id,
        name: String(task.name).trim().slice(0, 240),
        notes: String(task.notes || '').slice(0, 4000),
        priority: ['Urgent', 'High', 'Medium', 'Low'].includes(task.priority)
          ? task.priority : 'Medium',
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate || '') ? task.dueDate : '',
        boardId: String(task.boardId || ''),
        nodeId: String(task.nodeId || ''),
        createdAt: String(task.createdAt || ''),
      });
      target.setItem(TASK_BRIDGE_KEY, JSON.stringify(queued));
    }
    return true;
  } catch {
    return false; // The canvas still holds the task; never claim it reached Sai.
  }
}
