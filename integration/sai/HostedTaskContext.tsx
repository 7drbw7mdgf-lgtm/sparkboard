import React, { useEffect } from 'react';
import type { ProjectData } from './types';
import { sourceBoardHref } from './HostedPersistence';

export default function HostedTaskContext({
  projectData,
  editingTaskId,
  onOpenTask,
}: {
  projectData: ProjectData | null;
  editingTaskId: string | null;
  onOpenTask: (id: string) => void;
}) {
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('task');
    if (!id || !projectData?.tasks.some((task) => task.id === id)) return;
    onOpenTask(id);
    const url = new URL(location.href);
    url.searchParams.delete('task');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, [projectData, onOpenTask]);
  const task = projectData?.tasks.find((task) => task.id === editingTaskId);
  const href = task && sourceBoardHref(task);
  return href ? (
    <a className="benchline-source-board" href={href}>
      ← Open source board
    </a>
  ) : null;
}
