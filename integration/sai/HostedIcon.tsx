import React from 'react';

/** Consistent 18px outline icon geometry across the hosted planner. */
export type BenchlineIconName =
  | 'home'
  | 'tasks'
  | 'timeline'
  | 'calendar'
  | 'kanban'
  | 'plus'
  | 'chevron-down'
  | 'search'
  | 'undo'
  | 'redo'
  | 'menu'
  | 'settings'
  | 'help';

const strokes: Record<BenchlineIconName, React.ReactNode> = {
  home: (
    <>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  tasks: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="m7.5 12 2.5 2.5 5-5" />
    </>
  ),
  timeline: (
    <>
      <path d="M3 5h18M3 12h18M3 19h18" />
      <rect x="7" y="3" width="7" height="4" rx="1" fill="currentColor" stroke="none" />
      <rect x="11" y="10" width="8" height="4" rx="1" fill="currentColor" stroke="none" />
      <rect x="5" y="17" width="8" height="4" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 18h2" />
    </>
  ),
  kanban: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16M15 4v16M5 8h2M11 8h2M17 8h2M5 12h2M11 12h2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-1" />
    </>
  ),
  redo: (
    <>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H10a6 6 0 0 0 0 12h1" />
    </>
  ),
  menu: (
    <>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4" />
      <path d="M12 17h.01" />
    </>
  ),
};

export default function HostedIcon({
  name,
  size = 18,
  className = '',
}: {
  name: BenchlineIconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={'benchline-icon ' + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {strokes[name]}
    </svg>
  );
}
