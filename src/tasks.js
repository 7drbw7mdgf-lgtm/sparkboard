import { $, uid, node } from './core.js';
import { state } from './state.js';
import { commit } from './history.js';
import { render } from './rendering.js';
import { save } from './boards.js';
import { modal } from './dialogs.js';
import { toast } from './notifications.js';
import { centerPoint } from './viewport.js';
import { appendMindNode, addMindChild, isMindNode, layoutMindmap } from './mindmap-model.js';
import { themeNewMindTopic } from './mindmap-master.js';
import { publishTask, taskHandoffStatus, TASK_BRIDGE_RECEIPT_KEY } from './task-bridge.js';

const taskCSS = `
#objects .spark-task-tag{position:absolute;top:-13px;left:8px;padding:4px 9px;background:#4262ff;color:#fff;border-radius:10px;font:700 11px/1 Manrope,sans-serif;box-shadow:0 2px 7px #193c2b22;pointer-events:none;white-space:nowrap;z-index:5}
#objects .spark-task-tag.is-pending{background:#6b778e}
#objects .spark-task-tag.is-failed{background:#ae6737}
#spark-task-form{display:grid;gap:12px;max-width:440px}
#spark-task-form label{display:grid;gap:5px;font-weight:650;font-size:13px}
#spark-task-form input,#spark-task-form textarea,#spark-task-form select{box-sizing:border-box;width:100%;padding:10px;border:1px solid #e6e6e2;border-radius:9px;background:white;color:#292c31;font:inherit;font-size:16px}
#spark-task-form textarea{min-height:76px;resize:vertical}
#spark-task-form .spark-task-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}
#spark-task-form button{background:#4262ff;border-radius:8px;color:white;padding:12px;font-weight:700}
#spark-task-form button:hover{background:#2f4fe0}
#spark-task-form p{font-size:12px;line-height:1.45;color:#5c6570;margin:0}
@media(max-width:650px){#spark-task-form .spark-task-pair{grid-template-columns:1fr}#objects .spark-task-tag{font-size:10px}}
`;

function decorateTasks() {
  if (!state.board) return;
  const byId = new Map(state.board.objects.map((item) => [item.id, item]));
  $('#objects')
    ?.querySelectorAll('.object')
    .forEach((element) => {
      const item = byId.get(element.dataset.id);
      element.querySelector('.spark-task-tag')?.remove();
      if (!item?.sparkTask) return;
      const tag = document.createElement('span');
      const handoff = taskHandoffStatus(item.sparkTask.id);
      tag.className =
        'spark-task-tag' + (handoff === 'queued' ? ' is-pending' : handoff === 'missing' ? ' is-failed' : '');
      tag.textContent =
        handoff === 'saved' ? '✓ Sent to Benchline' : handoff === 'queued' ? '↗ To Benchline' : '↻ Task not sent';
      tag.title =
        handoff === 'saved'
          ? 'Sent to Benchline on this browser profile. Later edits and deletion are not synchronised.'
          : handoff === 'queued'
            ? 'Queued for Benchline. Open Benchline in this browser to import.'
            : 'Stored on this board. Open task creation or revisit this board to retry.';
      element.append(tag);
    });
}

function createTask() {
  if (!state.board) return;
  modal(
    'Add a task to your board',
    `
    <form id="spark-task-form">
      <label>Task name<input name="name" required maxlength="240" placeholder="e.g. Analyse RNA-seq results" autocomplete="off"></label>
      <div class="spark-task-pair">
        <label>Due date (optional)<input name="due" type="date"></label>
        <label>Priority<select name="priority"><option>Medium</option><option>High</option><option>Urgent</option><option>Low</option></select></label>
      </div>
      <label>Details (optional)<textarea name="notes" maxlength="4000" placeholder="What needs doing?"></textarea></label>
      <p>This creates a task in Benchline while keeping a linked visual node on your board. The task transfer works in this browser profile only.</p>
      <button type="submit">Create task</button>
    </form>`,
    'TASK',
  );
  const form = $('#spark-task-form');
  form?.querySelector('[name="name"]')?.focus();
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    if (!name || !state.board) return;
    const parent =
      state.selected.size === 1
        ? state.board.objects.find(
            (item) =>
              state.selected.has(item.id) &&
              !['connector', 'line', 'path', 'image', 'file', 'embed', 'frame'].includes(item.type),
          )
        : null;
    const selected = parent && isMindNode(parent) ? parent : null;
    const p = centerPoint();
    const taskId = uid();
    const nodeId = uid();
    const task = {
      id: taskId,
      name,
      notes: String(data.get('notes') || ''),
      dueDate: String(data.get('due') || ''),
      priority: String(data.get('priority') || 'Medium'),
      boardId: state.board.id,
      nodeId,
      createdAt: new Date().toISOString(),
    };
    commit(() => {
      let item;
      if (selected) {
        selected.mindCollapsed = false;
        item = addMindChild(state.board.objects, {
          id: nodeId,
          connectorId: uid(),
          parentId: selected.id,
          text: name,
        });
        themeNewMindTopic(state.board.objects, item.id);
        layoutMindmap(state.board.objects);
      } else if (['mindmap', 'outline'].includes(state.diagramMode)) {
        item = appendMindNode(state.board.objects, {
          id: nodeId,
          connectorId: uid(),
          x: p.x - 100,
          y: p.y - 37,
          text: name,
        });
      } else {
        item = node(
          'shape',
          parent ? parent.x + parent.w + 105 : p.x - 110,
          parent ? parent.y : p.y - 45,
          220,
          90,
          name,
          '#d6ecde',
        );
        item.id = nodeId;
        state.board.objects.push(item);
        if (parent) {
          state.board.objects.push({
            id: uid(),
            type: 'connector',
            from: parent.id,
            to: item.id,
            route: 'elbow',
            endArrow: 'arrow',
            color: '#65937c',
          });
        }
      }
      item.sparkTask = { ...task, pending: true };
      state.selected = new Set([item.id]);
    });
    const success = publishTask(task);
    if (success) {
      // Handoff confirmation is not a user edit: don't add a phantom Undo step.
      const item = state.board?.objects.find((n) => n.id === nodeId);
      if (item?.sparkTask) item.sparkTask.pending = taskHandoffStatus(taskId) !== 'saved';
      render();
      save();
    }
    $('#dialog')?.close();
    toast(
      success
        ? 'Task queued for Benchline. Open Benchline to complete the transfer.'
        : 'Task saved on board. Benchline handoff could not be queued.',
    );
  });
}

/** Retry any task not yet queued, without creating a new task or history entry. */
function retryBoardTasks() {
  if (!state.board) return;
  let changed = false;
  for (const item of state.board.objects) {
    if (!item.sparkTask?.id || taskHandoffStatus(item.sparkTask.id) !== 'missing') continue;
    if (publishTask(item.sparkTask)) {
      item.sparkTask.pending = taskHandoffStatus(item.sparkTask.id) !== 'saved';
      changed = true;
    }
  }
  if (changed) {
    save();
    decorateTasks();
  }
}

export function setupTaskWorkspace() {
  const styles = document.createElement('style');
  styles.textContent = taskCSS;
  document.head.append(styles);
  document.addEventListener('sparkboard:new-task', createTask);
  document.addEventListener('sparkboard:render', decorateTasks);
  window.addEventListener('storage', (event) => {
    if (event.key === TASK_BRIDGE_RECEIPT_KEY) decorateTasks();
  });
  window.addEventListener('focus', () => { retryBoardTasks(); decorateTasks(); });
  // A board may open after initialisation. Render is dispatched when the board is mounted.
  document.addEventListener('sparkboard:render', retryBoardTasks);
  decorateTasks();
  retryBoardTasks();
}
