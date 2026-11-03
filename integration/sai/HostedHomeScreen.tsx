import React, { useMemo } from 'react';
import { ProjectData, Task, View, WidgetLayout } from './types';

interface HomeScreenProps {
  projectData: ProjectData;
  onRequestEditTask: (taskId: string) => void;
  onRequestEditMeeting: (meetingId: string) => void;
  layout: WidgetLayout[];
  onLayoutChange: (layout: WidgetLayout[]) => void;
  onTogglePeopleHub?: () => void;
  onRequestAddTask: () => void;
  onRequestAddMeeting: () => void;
  onViewChange?: (view: View) => void;
  onSetProjectData?: React.Dispatch<React.SetStateAction<ProjectData | null>>;
}

const dateValue = (date: Date | string) => {
  const value = new Date(date).getTime();
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
};
const dateLabel = (date: Date | string) => {
  const timestamp = dateValue(date);
  return timestamp === Number.MAX_SAFE_INTEGER
    ? 'No date'
    : new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const cleanDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export default function HostedHomeScreen({
  projectData,
  onRequestEditTask,
  onRequestEditMeeting,
  onRequestAddMeeting,
  onViewChange,
  onSetProjectData,
}: HomeScreenProps) {
  const now = new Date();
  const startOfToday = cleanDay(now);
  const endOfWeek = startOfToday + 7 * 24 * 60 * 60 * 1000;
  const { openTasks, completedCount, dueSoonCount, overdueCount, nextMeeting } = useMemo(() => {
    const open = projectData.tasks
      .filter((task) => task.completion < 100)
      .sort((a, b) => dateValue(a.endDate) - dateValue(b.endDate));
    const upcoming = (projectData.meetings || [])
      .filter((meeting) => dateValue(meeting.date) >= startOfToday)
      .sort((a, b) => dateValue(a.date) - dateValue(b.date));
    return {
      openTasks: open,
      completedCount: projectData.tasks.filter((task) => task.completion === 100).length,
      dueSoonCount: open.filter((task) => dateValue(task.endDate) >= startOfToday && dateValue(task.endDate) < endOfWeek).length,
      overdueCount: open.filter((task) => dateValue(task.endDate) < startOfToday).length,
      nextMeeting: upcoming[0] || null,
    };
  }, [projectData, startOfToday, endOfWeek]);

  const markTask = (task: Task) => {
    onSetProjectData?.((previous) => previous
      ? { ...previous, tasks: previous.tasks.map((item) => item.id === task.id ? { ...item, completion: 100 } : item) }
      : previous);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] dark:bg-gray-950 benchline-overview">
      <div className="mx-auto max-w-[1080px] px-5 pb-12 pt-8 md:px-10 md:pt-11">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[.12em] text-[#697184] dark:text-gray-400">Project workspace</p>
            <h1 className="text-[28px] font-bold tracking-tight text-[#242934] dark:text-gray-100">Overview</h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#657082] dark:text-gray-400">What needs doing next. Everything else is one click away.</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2.5 sm:gap-4" aria-label="Project summary">
          <div className="rounded-xl border border-[#e5e8ee] bg-white p-3.5 sm:p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-[#697184] dark:text-gray-400">To do</p>
            <p className="mt-1 text-2xl font-semibold text-[#242934] dark:text-white">{openTasks.length}</p>
          </div>
          <div className="rounded-xl border border-[#e5e8ee] bg-white p-3.5 sm:p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-[#697184] dark:text-gray-400">Due soon</p>
            <p className="mt-1 text-2xl font-semibold text-[#242934] dark:text-white">{dueSoonCount}</p>
          </div>
          <div className="rounded-xl border border-[#e5e8ee] bg-white p-3.5 sm:p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-[#697184] dark:text-gray-400">Completed</p>
            <p className="mt-1 text-2xl font-semibold text-[#242934] dark:text-white">{completedCount}</p>
          </div>
        </div>

        {overdueCount > 0 && (
          <p role="status" className="mb-5 rounded-lg border border-[#f0dec4] bg-[#fffaf2] px-4 py-3 text-sm text-[#875f24] dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
            {overdueCount} overdue {overdueCount === 1 ? 'task needs' : 'tasks need'} attention.
            <button type="button" className="ml-2 font-semibold underline underline-offset-2" onClick={() => onViewChange?.(View.TASKS)}>View tasks</button>
          </p>
        )}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
          <section className="overflow-hidden rounded-xl border border-[#e5e8ee] bg-white dark:border-gray-800 dark:bg-gray-900" aria-labelledby="benchline-next-title">
            <div className="flex items-center justify-between gap-3 border-b border-[#edf0f3] px-5 py-4 dark:border-gray-800">
              <h2 id="benchline-next-title" className="text-base font-semibold text-[#242934] dark:text-white">Next tasks</h2>
              <button type="button" className="text-sm font-semibold text-[#4262ff] hover:underline" onClick={() => onViewChange?.(View.TASKS)}>All tasks</button>
            </div>
            {openTasks.length ? (
              <ul className="divide-y divide-[#edf0f3] dark:divide-gray-800">
                {openTasks.slice(0, 6).map((task) => {
                  const overdue = dateValue(task.endDate) < startOfToday;
                  return (
                    <li key={task.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                      <button
                        type="button"
                        onClick={() => markTask(task)}
                        className="h-6 w-6 flex-none rounded-full border-2 border-[#c9d1df] hover:border-[#4262ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4262ff]"
                        aria-label={'Mark ' + task.name + ' complete'}
                        title="Mark complete"
                      />
                      <button type="button" onClick={() => onRequestEditTask(task.id)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm font-medium text-[#242934] dark:text-white">{task.name}</span>
                        {task.id.startsWith('sparkboard:') && <span className="mt-0.5 block text-[11px] text-[#6677a9]">From Sparkboard</span>}
                      </button>
                      <span className={overdue ? 'shrink-0 text-xs font-semibold text-[#a66323]' : 'shrink-0 text-xs text-[#697184] dark:text-gray-400'}>{dateLabel(task.endDate)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-[#242934] dark:text-white">Nothing outstanding.</p>
                <p className="mt-1 text-xs text-[#697184] dark:text-gray-400">Add a task when you're ready.</p>
              </div>
            )}
          </section>

          <div className="space-y-5">
            <section className="rounded-xl border border-[#e5e8ee] bg-white p-5 dark:border-gray-800 dark:bg-gray-900" aria-labelledby="benchline-meeting-title">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="benchline-meeting-title" className="text-base font-semibold text-[#242934] dark:text-white">Next meeting</h2>
                <button type="button" onClick={() => onViewChange?.(View.CALENDAR)} className="text-xs font-semibold text-[#4262ff] hover:underline">Calendar</button>
              </div>
              {nextMeeting ? (
                <button type="button" onClick={() => onRequestEditMeeting(nextMeeting.id)} className="w-full rounded-lg bg-[#f6f8fc] p-3 text-left hover:bg-[#edf1fb] dark:bg-gray-800">
                  <span className="block text-sm font-medium text-[#242934] dark:text-white">{nextMeeting.title}</span>
                  <span className="mt-1 block text-xs text-[#697184] dark:text-gray-400">{dateLabel(nextMeeting.date)} · {nextMeeting.startTime || 'Time not set'}</span>
                </button>
              ) : (
                <div>
                  <p className="text-sm text-[#697184] dark:text-gray-400">No upcoming meetings.</p>
                  <button type="button" onClick={onRequestAddMeeting} className="mt-3 text-sm font-semibold text-[#4262ff] hover:underline">+ Add meeting</button>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-[#e5e8ee] bg-white p-5 dark:border-gray-800 dark:bg-gray-900" aria-labelledby="benchline-plan-title">
              <h2 id="benchline-plan-title" className="mb-3 text-base font-semibold text-[#242934] dark:text-white">Project dates</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-[#697184] dark:text-gray-400">Start</dt><dd className="font-medium text-[#242934] dark:text-white">{dateLabel(projectData.projectStartDate)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#697184] dark:text-gray-400">Finish</dt><dd className="font-medium text-[#242934] dark:text-white">{dateLabel(projectData.projectEndDate)}</dd></div>
              </dl>
              <button type="button" onClick={() => onViewChange?.(View.GANTT)} className="mt-5 text-sm font-semibold text-[#4262ff] hover:underline">Open timeline</button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
