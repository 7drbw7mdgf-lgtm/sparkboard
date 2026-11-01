import type { ProjectData } from './types';

// Sai is local-first on this hosting setup; unlike Sparkboard boards, these
// projects are NOT covered by the optional Supabase account sync.
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

export function saveHostedProject(data: ProjectData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    console.warn('Sai local save failed; export a project backup.');
  }
}

export function downloadHostedProject(data: ProjectData): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sai-project-backup.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
