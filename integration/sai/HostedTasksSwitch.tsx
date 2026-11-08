import React from 'react';
import { View } from './types';
import HostedIcon from './HostedIcon';

interface Props {
  currentView: View;
  onViewChange: (view: View) => void;
}

/** List and Kanban are two presentations of the same Tasks workspace. */
export default function HostedTasksSwitch({ currentView, onViewChange }: Props) {
  return (
    <nav className="benchline-tasks-subview" aria-label="Tasks view">
      <span className="benchline-tasks-subview-label">Tasks</span>
      <div className="benchline-tasks-subview-options" role="group" aria-label="Task layout">
        <button
          type="button"
          aria-pressed={currentView === View.TASKS}
          onClick={() => onViewChange(View.TASKS)}
        >
          <HostedIcon name="tasks" size={17} /> List
        </button>
        <button
          type="button"
          aria-pressed={currentView === View.KANBAN}
          onClick={() => onViewChange(View.KANBAN)}
        >
          <HostedIcon name="kanban" size={17} /> Kanban
        </button>
      </div>
    </nav>
  );
}
