/**
 * Same-origin task handoff to the hosted Sai/Benchline planner.
 * This is intentionally not account/cloud synchronisation: both apps must be opened at
 * sparkboard.co.uk in the same browser profile. Tasks stay queued until persisted by Sai.
 */
export const TASK_BRIDGE_KEY = 'sparkboard.sai.task-creation.v1';
export const TASK_BRIDGE_CHANNEL = 'sparkboard.sai.tasks';
export const TASK_BRIDGE_RECEIPT_KEY = 'sparkboard.sai.task-receipts.v1';

export function readTaskReceipts(storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    const value = JSON.parse(target.getItem(TASK_BRIDGE_RECEIPT_KEY) || '[]');
    return new Set(Array.isArray(value) ? value.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}
export function taskHandoffStatus(id, storage) {
  if (readTaskReceipts(storage).has(id)) return 'saved';
  return readTaskQueue(storage).some((task) => task.id === id) ? 'queued' : 'missing';
}


function notifyOpenPlanner() {
  try {
    const channel = new BroadcastChannel(TASK_BRIDGE_CHANNEL);
    channel.postMessage({ type: 'tasks' });
    channel.close();
  } catch {
    // Other tabs still observe the localStorage write.
  }
}

export function readTaskQueue(storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    const items = JSON.parse(target.getItem(TASK_BRIDGE_KEY) || '[]');
    return Array.isArray(items)
      ? items.filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
      : [];
  } catch {
    return [];
  }
}

export function publishTask(task, storage) {
  if (!task || typeof task.id !== 'string' || !task.id || !String(task.name || '').trim())
    throw Error('A task requires an ID and title.');
  try {
    const target = storage ?? globalThis.localStorage;
    // If the planner has acknowledged the ID, do not re-create a deliberately deleted task.
    if (readTaskReceipts(target).has(task.id)) return true;
    const queued = readTaskQueue(target);
    if (!queued.some((item) => item.id === task.id)) {
      queued.push({
        id: task.id,
        name: String(task.name).trim().slice(0, 240),
        notes: String(task.notes || '').slice(0, 4000),
        priority: ['Urgent', 'High', 'Medium', 'Low'].includes(task.priority)
          ? task.priority
          : 'Medium',
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate || '') ? task.dueDate : '',
        boardId: String(task.boardId || ''),
        nodeId: String(task.nodeId || ''),
        createdAt: String(task.createdAt || ''),
      });
      target.setItem(TASK_BRIDGE_KEY, JSON.stringify(queued));
      notifyOpenPlanner();
    }
    return true;
  } catch {
    return false; // The canvas still holds the task; never claim it reached Sai.
  }
}
