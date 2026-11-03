import React from 'react';
import { View } from './types';

interface Props {
  currentView: View;
  onViewChange: (view: View) => void;
  onSettings: () => void;
  onAddTask: () => void;
  onAddNote?: () => void;
  onTogglePeopleHub?: () => void;
  onToggleAIAssistant?: () => void;
  onOpenShortcutHelp: () => void;
}

const navItems = [
  { id: View.HOME, label: 'Overview', symbol: '⌂' },
  { id: View.TASKS, label: 'Tasks', symbol: '☑' },
  { id: View.GANTT, label: 'Timeline', symbol: '≡' },
  { id: View.CALENDAR, label: 'Calendar', symbol: '▦' },
];

export default function HostedSidebar({
  currentView, onViewChange, onSettings, onAddTask, onOpenShortcutHelp,
}: Props) {
  return (
    <nav className="benchline-sidebar h-full w-[172px] shrink-0 border-r border-[#e5e8ee] bg-white px-3 py-5 dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between" aria-label="Benchline navigation">
      <div>
        <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[.13em] text-[#8a94a4] dark:text-gray-500">Workspace</p>
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              aria-current={currentView === item.id ? 'page' : undefined}
              className={'flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ' +
                (currentView === item.id
                  ? 'bg-[#edf1ff] font-semibold text-[#3352df] dark:bg-blue-950/40 dark:text-blue-300'
                  : 'font-medium text-[#5c6570] hover:bg-[#f5f6f8] hover:text-[#252b37] dark:text-gray-300 dark:hover:bg-gray-800')}
            >
              <span aria-hidden="true" className="w-5 text-center text-[17px]">{item.symbol}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <details className="group mt-3 border-t border-[#edf0f3] pt-2 dark:border-gray-800">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-lg px-3 text-sm font-medium text-[#657082] hover:bg-[#f5f6f8] dark:text-gray-400 dark:hover:bg-gray-800">
            <span>More views</span><span className="text-xs transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <button type="button" onClick={() => onViewChange(View.KANBAN)} aria-current={currentView === View.KANBAN ? 'page' : undefined}
            className={'mt-1 w-full rounded-lg px-3 py-2 text-left text-sm ' +
              (currentView === View.KANBAN ? 'bg-[#edf1ff] font-semibold text-[#3352df]' : 'text-[#657082] hover:bg-[#f5f6f8] dark:text-gray-400 dark:hover:bg-gray-800')}>
            Kanban board
          </button>
        </details>
      </div>
      <div className="space-y-2">
        <button type="button" onClick={onAddTask}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#4262ff] px-3 text-sm font-semibold text-white hover:bg-[#304bdc]">
          <span aria-hidden="true">+</span> New task
        </button>
        <div className="border-t border-[#edf0f3] pt-2 dark:border-gray-800">
          <button type="button" onClick={onSettings} className="block min-h-10 w-full rounded-lg px-3 text-left text-sm text-[#657082] hover:bg-[#f5f6f8] dark:text-gray-400 dark:hover:bg-gray-800">Settings</button>
          <button type="button" onClick={onOpenShortcutHelp} className="block min-h-10 w-full rounded-lg px-3 text-left text-sm text-[#657082] hover:bg-[#f5f6f8] dark:text-gray-400 dark:hover:bg-gray-800">Keyboard shortcuts</button>
        </div>
      </div>
    </nav>
  );
}
