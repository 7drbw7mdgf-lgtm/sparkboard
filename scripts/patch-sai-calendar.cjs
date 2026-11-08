'use strict';
/* Hosted Benchline calendar enhancements for pinned Sai source. */
const fs = require('node:fs');
const path = require('node:path');
const { swap } = require('./patch-sai-gantt.cjs');

function patchHostedCalendar(root) {
  const file = path.join(root, 'components', 'CalendarView.tsx');
  let s = fs.readFileSync(file, 'utf8');
  s = swap(s,
    "import CalendarSyncModal from './CalendarSyncModal';",
    "import CalendarSyncModal from './CalendarSyncModal';\nimport HostedCalendarOverview from './HostedCalendarOverview';");
  s = swap(s,
    "type CalendarViewMode = 'month' | 'week' | 'day';",
    "type CalendarViewMode = 'month' | 'week' | 'day' | '3day' | 'quarter' | 'year';");

  // Start with a month when no preference exists. Store only a view preference.
  s = swap(s,
    "    const [viewMode, setViewMode] = useState<CalendarViewMode>('month');",
    [
      "    const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {",
      "        try {",
      "            const saved = localStorage.getItem('benchline-calendar-view');",
      "            if (['day', '3day', 'week', 'month', 'quarter', 'year'].includes(saved || '')) return saved as CalendarViewMode;",
      "        } catch { /* private browsing */ }",
      "        return 'month';",
      "    });",
      "    useEffect(() => { try { localStorage.setItem('benchline-calendar-view', viewMode); } catch { /* storage unavailable */ } }, [viewMode]);",
    ].join('\n'));

  const from = s.indexOf('    // Navigation Handlers\n');
  const to = s.indexOf('    const handleToggleCalendar = ', from);
  if (from < 0 || to < 0) throw Error('Calendar navigation anchors changed');
  const nav = [
    '    // Calendar navigation advances by the selected actual calendar period.',
    '    const shiftDate = (date: Date, direction: number) => {',
    "        if (viewMode === 'month') return new Date(date.getFullYear(), date.getMonth() + direction, 1);",
    "        if (viewMode === 'quarter') return new Date(date.getFullYear(), date.getMonth() + 3 * direction, 1);",
    "        if (viewMode === 'year') return new Date(date.getFullYear() + direction, date.getMonth(), 1);",
    "        return addDays(date, (viewMode === 'week' ? 7 : viewMode === '3day' ? 3 : 1) * direction);",
    '    };',
    '    const handlePrev = () => setCurrentDate(d => shiftDate(d, -1));',
    '    const handleNext = () => setCurrentDate(d => shiftDate(d, 1));',
    '    const handleToday = () => setCurrentDate(new Date());',
    '    const dateInputValue = [currentDate.getFullYear(), String(currentDate.getMonth() + 1).padStart(2, "0"), String(currentDate.getDate()).padStart(2, "0")].join("-");',
    '    const handleJumpToDate = (value: string) => {',
    '        if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return;',
    '        const [year, month, day] = value.split("-").map(Number);',
    '        const date = new Date(year, month - 1, day);',
    '        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) setCurrentDate(date);',
    '    };',
    '',
  ].join('\n');
  s = s.slice(0, from) + nav + s.slice(to);

  // Use Monday as the start of each calendar week; consistent with mini-overviews.
  s = swap(s,
    '        return addDays(d, -dayOfWeek);',
    '        return addDays(d, -((dayOfWeek + 6) % 7));');

  const headerFrom = s.indexOf('    // Render Header\n');
  const headerTo = s.indexOf('    return (\n        <div className="flex h-full bg-white dark:bg-gray-900">', headerFrom);
  if (headerFrom < 0 || headerTo < 0) throw Error('Calendar title anchors changed');
  const header = [
    '    const headerDate = useMemo(() => {',
    "        const dateLabel = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });",
    "        if (viewMode === 'month') return currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });",
    "        if (viewMode === 'year') return String(currentDate.getFullYear());",
    "        if (viewMode === 'quarter') return 'Q' + (Math.floor(currentDate.getMonth() / 3) + 1) + ' ' + currentDate.getFullYear();",
    "        if (viewMode === 'day') return dateLabel(currentDate);",
    "        const start = viewMode === 'week' ? weekStartDate : currentDate;",
    "        const end = addDays(start, viewMode === 'week' ? 6 : 2);",
    '        return dateLabel(start) + " – " + dateLabel(end);',
    '    }, [currentDate, viewMode, weekStartDate]);',
    '',
  ].join('\n');
  s = s.slice(0, headerFrom) + header + s.slice(headerTo);

  // Replace the crowded three-column toolbar while keeping all calendar data and views.
  const main = s.indexOf("const CalendarView: React.FC<CalendarViewProps> = (props) => {");
  const toolbarStart = s.indexOf('                {/* Toolbar */}', main);
  const toolbarEnd = s.indexOf('                {/* View Area */}', toolbarStart);
  if (main < 0 || toolbarStart < 0 || toolbarEnd < 0) throw Error('Calendar toolbar anchors changed');
  const toolbar = [
    '                {/* Calendar period and navigation */}',
    '                <header className="benchline-calendar-toolbar">',
    '                    <div className="benchline-calendar-title-row">',
    '                        <h2 className="benchline-calendar-title" aria-live="polite">{headerDate}</h2>',
    '                        <div className="benchline-calendar-nav">',
    '                            <button type="button" aria-label="Previous period" onClick={handlePrev}><ChevronLeftIcon className="w-5 h-5" /></button>',
    '                            <button type="button" className="benchline-calendar-today" onClick={handleToday}>Today</button>',
    '                            <button type="button" aria-label="Next period" onClick={handleNext}><ChevronRightIcon className="w-5 h-5" /></button>',
    '                        </div>',
    '                    </div>',
    '                    <div className="benchline-calendar-actions">',
    '                        <label htmlFor="benchline-calendar-view">View</label>',
    '                        <select id="benchline-calendar-view" aria-label="Calendar time view" value={viewMode} onChange={e => setViewMode(e.target.value as CalendarViewMode)}>',
    '                            <option value="day">Day</option>',
    '                            <option value="3day">3 days</option>',
    '                            <option value="week">Week</option>',
    '                            <option value="month">Month</option>',
    '                            <option value="quarter">Quarter</option>',
    '                            <option value="year">Year</option>',
    '                        </select>',
    '                        <label className="benchline-calendar-jump-label" htmlFor="benchline-calendar-jump">Go to</label>',
    '                        <input type="date" id="benchline-calendar-jump" aria-label="Jump to date" value={dateInputValue} onChange={e => handleJumpToDate(e.target.value)} />',
    '                        <details className="benchline-calendar-sources">',
    '                            <summary>Show</summary>',
    '                            <div className="benchline-calendar-source-popover">',
    '                                {(["tasks", "meetings", "google", "outlook"] as const).map(source => (',
    '                                    <label key={source} className="benchline-calendar-source-option">',
    '                                        <input type="checkbox" checked={visibleCalendars[source]} onChange={() => handleToggleCalendar(source)} />',
    '                                        <span>{source === "google" ? "Google" : source === "outlook" ? "Outlook" : source === "tasks" ? "Tasks" : "Meetings"}</span>',
    '                                    </label>',
    '                                ))}',
    '                            </div>',
    '                        </details>',
    '                        <button type="button" className="benchline-calendar-settings" onClick={() => setIsSyncModalOpen(true)}>Calendar settings</button>',
    '                    </div>',
    '                    {syncToast && <div className="benchline-calendar-sync-message" role="status">{syncToast}</div>}',
    '                </header>',
    '',
  ].join('\n');
  s = s.slice(0, toolbarStart) + toolbar + s.slice(toolbarEnd);

  // Broader calendar views use a compact month matrix with day-level task and meeting markers.
  const viewAnchor="                    {viewMode === 'month' && (";
  s = swap(s, viewAnchor,
    [
      "                    {(viewMode === 'quarter' || viewMode === 'year') && (",
      '                        <HostedCalendarOverview',
      '                            projectData={props.projectData}',
      '                            currentDate={currentDate}',
      '                            mode={viewMode}',
      "                            onChooseMonth={date => { setCurrentDate(date); setViewMode('month'); }}",
      "                            onChooseDay={date => { setCurrentDate(date); setViewMode('day'); }}",
      '                            visibleCalendars={visibleCalendars}',
      '                        />',
      '                    )}',
      viewAnchor,
    ].join('\n'));
  s = swap(s,
    "                    {viewMode === 'day' && (\n",
    [
      "                    {viewMode === '3day' && (",
      '                        <div className="benchline-calendar-week-scroll">',
      '                            <WeekDayView',
      '                                projectData={props.projectData}',
      '                                onSetData={props.onSetData}',
      '                                startDate={currentDate}',
      '                                numDays={3}',
      '                                onRequestEditTask={props.onRequestEditTask}',
      '                                onRequestEditMeeting={props.onRequestEditMeeting}',
      '                                visibleCalendars={visibleCalendars}',
      '                            />',
      '                        </div>',
      '                    )}',
      "                    {viewMode === 'day' && (",
      '',
    ].join('\n'));

  // Week must remain a true seven-day view and scroll horizontally on narrow screens,
  // with both the day headings and timed events sharing one scroll container.
  s = swap(s,
    '                    {viewMode === \'week\' && (\n                        <WeekDayView',
    '                    {viewMode === \'week\' && (\n                        <div className="benchline-calendar-week-scroll"><WeekDayView');
  s = swap(s,
    '                            numDays={7}\n                            onRequestEditTask={props.onRequestEditTask}\n                            onRequestEditMeeting={props.onRequestEditMeeting}\n                            visibleCalendars={visibleCalendars}\n                        />\n                    )}',
    '                            numDays={7}\n                            onRequestEditTask={props.onRequestEditTask}\n                            onRequestEditMeeting={props.onRequestEditMeeting}\n                            visibleCalendars={visibleCalendars}\n                        /></div>\n                    )}');

  // Time headings and event cards gain explicitly addressable styles.
  s = swap(s,
    '    return (\n        <div className="flex h-full bg-white dark:bg-gray-900">\n            {/* Sidebar */}',
    '    return (\n        <div className="benchline-calendar flex h-full bg-white dark:bg-gray-900">\n            {/* Sidebar */}');
  s = swap(s,
    '        <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden">\n            {/* Header Row */}',
    '        <div className="benchline-calendar-timegrid flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden" data-days={numDays}>\n            {/* Header Row */}');
  s = swap(s,
    'className="py-3 text-center border-r border-gray-100 dark:border-gray-800 last:border-r-0"',
    'className="benchline-calendar-day-heading py-3 text-center border-r border-gray-100 dark:border-gray-800 last:border-r-0"');
  s = swap(s,
    'className="flex-1 overflow-y-auto relative flex"',
    'className="benchline-calendar-hours flex-1 overflow-y-auto relative flex"');
  s = swap(s,
    'className="absolute inset-x-0 rounded-md p-2 text-xs shadow-sm border-l-4 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"',
    'className="benchline-calendar-timed-event absolute inset-x-0 rounded-md p-2 text-xs shadow-sm border-l-4 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"');
  s = swap(s,
    '        <div className="flex flex-col h-full bg-white dark:bg-gray-900">\n            {/* Days Header */}',
    '        <div className="benchline-calendar-month-view flex flex-col h-full bg-white dark:bg-gray-900">\n            {/* Days Header */}');
  s = swap(s,
    '                {weekDays.map(day => (',
    '                {weekDays.map(day => (');
  // These source-specific hints are deliberately removed: the feed may not have been
  // connected, and a background sync must never be described as active without proof.
  const liveLabel = '                            Live Sync Active';
  if (s.includes(liveLabel)) s = swap(s, liveLabel, '                            Calendar feeds');
  s = swap(s, '                        <span className="text-[10px] font-medium text-gray-500">2-Way</span>',
    '                        <span className="text-[10px] font-medium text-gray-500">Optional</span>');
  s = swap(s, '                        Syncs tasks & meetings with Google Calendar and Outlook.',
    '                        Review calendar feed and export options.');

  fs.writeFileSync(file, s);
  fs.copyFileSync(
    path.join(root, '..', '..', 'integration/sai/HostedCalendarOverview.tsx'),
    path.join(root, 'components', 'HostedCalendarOverview.tsx')
  );
}

module.exports = { patchHostedCalendar };
