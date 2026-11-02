import type { ProjectData } from './types';

// Benchline (formerly Sai) is local-first on this hosting setup; unlike Sparkboard boards, these
// projects are NOT covered by the optional Supabase account sync.
// Key keeps its original name so projects saved before the rename still load.
const KEY = 'sai.hosted.project.v1';

function asDate(value: unknown): Date {
  const date = new Date(value as string);
  if (!Number.isFinite(date.getTime())) throw Error('Invalid project date');
  return date;
}

export function loadHostedProject(): ProjectData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ProjectData;
    if (
      !data ||
      !Array.isArray(data.tasks) ||
      !Array.isArray(data.groups) ||
      !Array.isArray(data.people) ||
      !Array.isArray(data.notes)
    )
      return null;
    data.projectStartDate = asDate(data.projectStartDate);
    data.projectEndDate = asDate(data.projectEndDate);
    for (const task of data.tasks) {
      task.startDate = asDate(task.startDate);
      task.endDate = asDate(task.endDate);
    }
    for (const assignment of data.assignments || []) {
      assignment.startDate = asDate(assignment.startDate);
      assignment.endDate = asDate(assignment.endDate);
    }
    for (const meeting of data.meetings || []) meeting.date = asDate(meeting.date);
    for (const job of data.jobs || []) {
      job.startDate = asDate(job.startDate);
      job.endDate = asDate(job.endDate);
      job.createdAt = asDate(job.createdAt);
    }
    for (const note of data.notes) {
      note.createdAt = asDate(note.createdAt);
      note.updatedAt = asDate(note.updatedAt);
    }
    return data;
  } catch {
    return null;
  }
}

// Task creations move between Sparkboard and the hosted planner on the same origin/profile.
// This queue is NOT shared across devices or other domains.
export const TASK_BRIDGE_KEY = 'sparkboard.sai.task-creation.v1';

type BridgeTask = {
  id: string;
  name: string;
  notes?: string;
  priority?: string;
  dueDate?: string;
  boardId?: string;
  nodeId?: string;
};

function incomingTasks(): BridgeTask[] {
  try {
    const value = JSON.parse(localStorage.getItem(TASK_BRIDGE_KEY) || '[]');
    return Array.isArray(value)
      ? value.filter((t): t is BridgeTask =>
        t && typeof t.id === 'string' && t.id.length > 0 &&
        typeof t.name === 'string' && t.name.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function mergeSparkboardTasks(project: ProjectData | null): ProjectData | null {
  if (!project) return project;
  const known = new Set(project.tasks.map(t => t.id));
  const now = new Date();
  const created: ProjectData['tasks'] = [];
  for (const incoming of incomingTasks()) {
    const id = 'sparkboard:' + incoming.id;
    if (known.has(id)) continue;
    known.add(id);
    const parsed = /^\\d{4}-\\d{2}-\\d{2}$/.test(incoming.dueDate || '')
      ? new Date(incoming.dueDate + 'T12:00:00') : now;
    const endDate = Number.isFinite(parsed.getTime()) ? parsed : now;
    const startDate = endDate < now ? endDate : now;
    const context = incoming.boardId ? '\\nSparkboard source board: ' + incoming.boardId : '';
    created.push({
      id,
      name: incoming.name.trim().slice(0, 240),
      startDate,
      endDate,
      assignedTo: [],
      color: '#d6ecde',
      completion: 0,
      priority: ['Urgent', 'High', 'Medium', 'Low'].includes(incoming.priority || '')
        ? incoming.priority as NonNullable<ProjectData['tasks'][number]['priority']>
        : undefined,
      notes: String(incoming.notes || '').slice(0, 4000) + context,
      source: 'local',
      externalId: incoming.id,
    });
  }
  if (!created.length) return project;
  return {
    ...project,
    tasks: [...project.tasks, ...created],
    projectStartDate: new Date(Math.min(project.projectStartDate.getTime(), ...created.map(t => t.startDate.getTime()))),
    projectEndDate: new Date(Math.max(project.projectEndDate.getTime(), ...created.map(t => t.endDate.getTime()))),
  };
}

export function saveHostedProject(data: ProjectData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    // Acknowledge only tasks confirmed in a successful project save. Acknowledged
    // creations are never re-imported after somebody intentionally deletes them.
    const imported = new Set(data.tasks.filter(t => t.id.startsWith('sparkboard:'))
      .map(t => t.id.slice('sparkboard:'.length)));
    const queued = incomingTasks();
    if (queued.some(task => imported.has(task.id))) {
      localStorage.setItem(TASK_BRIDGE_KEY,
        JSON.stringify(queued.filter(task => !imported.has(task.id))));
    }
  } catch {
    console.warn('Benchline local save failed; export a project backup.');
  }
}

export function downloadHostedProject(data: ProjectData): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'benchline-project-backup.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
