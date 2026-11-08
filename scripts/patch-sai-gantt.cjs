'use strict';
/**
 * Apply only to the pinned Sai revision after patch-sai-planner.cjs.
 * Date headings and task manipulation improvements for hosted Benchline.
 */
const fs = require('node:fs');
const path = require('node:path');

function edit(filePath, transform) {
  const old = fs.readFileSync(filePath, 'utf8');
  const next = transform(old);
  if (next === old) throw Error('No Gantt changes in ' + filePath);
  fs.writeFileSync(filePath, next);
}
function swap(text, find, replacement, expected = 1) {
  const count = text.split(find).length - 1;
  if (count !== expected)
    throw Error('Gantt patch expected ' + expected + ' matches, got ' + count + ': ' + find.slice(0, 95));
  return text.split(find).join(replacement);
}

function swapFirst(text, find, replacement) {
  const at = text.indexOf(find);
  if (at < 0) throw Error('Gantt first patch missing: ' + find.slice(0, 95));
  return text.slice(0, at) + replacement + text.slice(at + find.length);
}

function patchHostedGantt(root) {
  const components = path.join(root, 'components');
  edit(path.join(components, 'ganttLayout.ts'), s => {
    s = swap(s, "export type GanttViewMode = 'day' | 'week' | 'month';", "export type GanttViewMode = 'day' | 'week' | 'month' | 'quarter' | 'year';");
    return swap(s, 'export const HEADER_HEIGHT = 56;', 'export const HEADER_HEIGHT = 64;');
  });
  edit(path.join(root, 'App.tsx'), s => {
    s = swap(s,
      "    const [ganttViewMode, setGanttViewMode] = useState<'day' | 'week' | 'month'>('day');",
      [
        "    const [ganttViewMode, setGanttViewMode] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>(() => {",
        "        try {",
        "            const saved = localStorage.getItem('benchline-gantt-scale');",
        "            if (saved === 'day' || saved === 'week' || saved === 'month' || saved === 'quarter' || saved === 'year') return saved;",
        "        } catch { /* private browsing */ }",
        "        return 'week';",
        "    });",
        "    useEffect(() => { try { localStorage.setItem('benchline-gantt-scale', ganttViewMode); } catch { /* storage unavailable */ } }, [ganttViewMode]);",
      ].join('\n'),
    );
    s = swap(s,
      "    const GANTT_ZOOM_LEVELS: { [key in 'day' | 'week' | 'month']: number } = { day: 40, week: 10, month: 2 };",
      "    const GANTT_ZOOM_LEVELS: Record<'day' | 'week' | 'month' | 'quarter' | 'year', number> = { day: 40, week: 14, month: 6, quarter: 3, year: 2 };",
    );
    return s;
  });

  // A dropdown for unit selection replaces three buttons. This file remains
  // under integration/sai so it is auditable independently of the pinned source.
  fs.copyFileSync(
    path.join(root, '..', '..', 'integration/sai/HostedViewControls.tsx'),
    path.join(components, 'ViewControls.tsx'),
  );

  edit(path.join(components, 'Timeline.tsx'), s => {
    s = swap(s,
      "        if (ganttViewMode === 'month') {",
      [
        "        if (ganttViewMode === 'year') {",
        "            return {",
        "                topSegments: buildSegments(projectStartDate, displayDays,",
        "                    d => String(Math.floor(d.getFullYear() / 10) * 10),",
        "                    (d, px) => px >= 36 ? \u0060\u0024{Math.floor(d.getFullYear() / 10) * 10}–\u0024{Math.floor(d.getFullYear() / 10) * 10 + 9}\u0060 : '', zoom),",
        "                bottomSegments: buildSegments(projectStartDate, displayDays,",
        "                    d => String(d.getFullYear()),",
        "                    (d, px) => px >= 30 ? String(d.getFullYear()) : px >= 16 ? String(d.getFullYear()).slice(2) : '', zoom),",
        "            };",
        "        }",
        "        if (ganttViewMode === 'quarter') {",
        "            return {",
        "                topSegments: buildSegments(projectStartDate, displayDays,",
        "                    d => String(d.getFullYear()),",
        "                    (d, px) => px >= 32 ? String(d.getFullYear()) : '', zoom),",
        "                bottomSegments: buildSegments(projectStartDate, displayDays,",
        "                    d => \u0060\u0024{d.getFullYear()}-Q\u0024{Math.floor(d.getMonth() / 3) + 1}\u0060,",
        "                    (d, px) => px >= 22 ? \u0060Q\u0024{Math.floor(d.getMonth() / 3) + 1}\u0060 : '', zoom),",
        "            };",
        "        }",
        "        if (ganttViewMode === 'month') {",
      ].join('\n')
    );
    s = swap(s,
      "if (ganttViewMode === 'month' || zoom < 6) return [];",
      "if (ganttViewMode === 'month' || ganttViewMode === 'quarter' || ganttViewMode === 'year' || zoom < 6) return [];");
    s = swap(s,
      "const isToday = emphasis === 'bottom' && ganttViewMode === 'day' && seg.start === todayOffset;",
      "const isToday = emphasis === 'bottom' && showToday && todayOffset >= seg.start && todayOffset < seg.start + seg.length && !!seg.label;");
    s = swap(s,
      'title={seg.label}',
      "title={\u0060\u0024{addDays(projectStartDate, seg.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – \u0024{addDays(projectStartDate, seg.start + seg.length - 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}\u0060}");
    s = swap(s,
      "className={\u0060flex border-b border-[#e6e6e2] dark:border-gray-800",
      "className={\u0060benchline-gantt-date-row flex border-b border-[#e6e6e2] dark:border-gray-800");
    return s;
  });

  edit(path.join(components, 'GanttTaskBar.tsx'), s => {
    s = swap(s,
      'const DRAG_THRESHOLD = 3;', 'const DRAG_THRESHOLD = 5;');
    s = swap(s,
      'const handleMouseDown = (e: React.MouseEvent, type: Interaction) => {',
      'const handleMouseDown = (e: React.PointerEvent, type: Interaction) => {');
    s = swap(s,
      '        const startX = e.clientX;',
      [
        '        const pointerId = e.pointerId;',
        '        try { e.currentTarget.setPointerCapture(pointerId); } catch { /* detached node */ }',
        '        const startX = e.clientX;',
      ].join('\n'));
    s = swap(s,
      'const handleCompletionMouseDown = (e: React.MouseEvent) => {',
      'const handleCompletionMouseDown = (e: React.PointerEvent) => {');
    s = swap(s,
      '        setIsChangingCompletion(true);',
      [
        '        const pointerId = e.pointerId;',
        '        try { e.currentTarget.setPointerCapture(pointerId); } catch { /* detached node */ }',
        '        setIsChangingCompletion(true);',
      ].join('\n'));
    s = swap(s,
      'const handleMouseMove = (moveEvent: MouseEvent) => {',
      'const handleMouseMove = (moveEvent: PointerEvent) => {\n            if (moveEvent.pointerId !== pointerId) return;',
      2);
    s = swap(s,
      'const handleMouseUp = () => {',
      'const handleMouseUp = (upEvent: PointerEvent) => {\n            if (upEvent.pointerId !== pointerId) return;',
      2);
    s = swap(s, "document.removeEventListener('mousemove', handleMouseMove)", "document.removeEventListener('pointermove', handleMouseMove)", 2);
    s = swap(s, "document.removeEventListener('mouseup', handleMouseUp)", "document.removeEventListener('pointerup', handleMouseUp)", 2);
    s = swap(s, "document.addEventListener('mousemove', handleMouseMove)", "document.addEventListener('pointermove', handleMouseMove)", 2);
    s = swap(s, "document.addEventListener('mouseup', handleMouseUp)", "document.addEventListener('pointerup', handleMouseUp)", 2);

    // Pointer cancel must roll back any uncommitted preview, e.g. interrupted touch.
    s = swapFirst(s,
      "        document.addEventListener('pointermove', handleMouseMove);\n        document.addEventListener('pointerup', handleMouseUp);\n    };",
      [
        '        const handleCancel = (event: PointerEvent) => {',
        '            if (event.pointerId !== pointerId) return;',
        "            document.removeEventListener('pointermove', handleMouseMove);",
        "            document.removeEventListener('pointerup', handleMouseUp);",
        "            document.removeEventListener('pointercancel', handleCancel);",
        "            document.body.style.cursor = '';",
        "            document.body.style.userSelect = '';",
        '            setInteraction(null);',
        '            didDragRef.current = false;',
        '            onDragPreview(null);',
        '        };',
        "        document.addEventListener('pointermove', handleMouseMove);",
        "        document.addEventListener('pointerup', handleMouseUp);",
        "        document.addEventListener('pointercancel', handleCancel);",
        '    };',
      ].join('\n'), 1);
    s = swapFirst(s,
      "            document.body.style.cursor = '';\n            document.body.style.userSelect = '';\n            setInteraction(null);",
      "            document.body.style.cursor = '';\n            document.body.style.userSelect = '';\n            document.removeEventListener('pointercancel', handleCancel);\n            setInteraction(null);", 1);
    // Progress editing is pointer-capable too.
    s = swap(s,
      "            document.removeEventListener('pointerup', handleMouseUp);\n        };\n\n        document.addEventListener('pointermove', handleMouseMove);\n        document.addEventListener('pointerup', handleMouseUp);\n    };",
      [
        "            document.removeEventListener('pointerup', handleMouseUp);",
        "            document.removeEventListener('pointercancel', handleCancel);",
        '        };',
        '        const handleCancel = (event: PointerEvent) => {',
        '            if (event.pointerId !== pointerId) return;',
        '            setIsChangingCompletion(false);',
        '            setCompletionPreview(null);',
        "            document.removeEventListener('pointermove', handleMouseMove);",
        "            document.removeEventListener('pointerup', handleMouseUp);",
        "            document.removeEventListener('pointercancel', handleCancel);",
        '        };',
        '',
        "        document.addEventListener('pointermove', handleMouseMove);",
        "        document.addEventListener('pointerup', handleMouseUp);",
        "        document.addEventListener('pointercancel', handleCancel);",
        '    };',
      ].join('\n'));
    s = swap(s, "onMouseDown={(e) => {", "onPointerDown={(e) => {", 3); // bar + dependency nodes
    s = swap(s, "onMouseDown={handleCompletionMouseDown}", "onPointerDown={handleCompletionMouseDown}", 2);
    s = swap(s, "onMouseDown={(e) => handleMouseDown(e, 'resize-left')}", "onPointerDown={(e) => handleMouseDown(e, 'resize-left')}");
    s = swap(s, "onMouseDown={(e) => handleMouseDown(e, 'resize-right')}", "onPointerDown={(e) => handleMouseDown(e, 'resize-right')}");
    s = swap(s, 'className="absolute pointer-events-auto"', 'className="benchline-gantt-task-wrapper absolute pointer-events-auto"');
    s = swap(s, 'className={\u0060group/bar relative w-full h-full rounded-xl', 'className={\u0060benchline-gantt-task-bar group/bar relative w-full h-full rounded-xl');
    s = swap(s,
      "className=\"absolute left-0 top-0 h-full w-2.5 cursor-ew-resize hover:bg-black/10 rounded-l-xl opacity-0 group-hover/bar:opacity-100 transition-opacity\"",
      "className=\"benchline-gantt-resize-handle benchline-gantt-resize-left absolute left-0 top-0 h-full w-3.5 cursor-ew-resize hover:bg-black/10 rounded-l-xl opacity-30 group-hover/bar:opacity-100 transition-opacity\"");
    s = swap(s,
      "className=\"absolute right-0 top-0 h-full w-2.5 cursor-ew-resize hover:bg-black/10 rounded-r-xl opacity-0 group-hover/bar:opacity-100 transition-opacity\"",
      "className=\"benchline-gantt-resize-handle benchline-gantt-resize-right absolute right-0 top-0 h-full w-3.5 cursor-ew-resize hover:bg-black/10 rounded-r-xl opacity-30 group-hover/bar:opacity-100 transition-opacity\"");
    s = swap(s,
      '            if (!didDragRef.current) return;',
      '            if (!didDragRef.current) { onSelectTask(task.id); return; }');
    s = swap(s,
      '            if (changed) onDragCommit(task.id, latest.startDate, latest.endDate);',
      '            if (changed) { onDragCommit(task.id, latest.startDate, latest.endDate); onSelectTask(task.id); }');
    s = swap(s,
      "                tabIndex={0}\n                aria-label={",
      "                tabIndex={0}\n                title={isLinking ? 'Choose this task as a dependency' : 'Drag to move dates; drag bar ends to resize. Double-click to edit. Arrow keys move by one day.'}\n                aria-label={");
    s = swap(s,
      "{!isLinking && interaction !== 'drag' && !isChangingCompletion && (",
      "{!isLinking && barWidth >= 22 && interaction !== 'drag' && !isChangingCompletion && (");
    // Date editing works without precision dragging: arrows nudge a whole task by a day.
    s = swap(s,
      "                    if (e.key === 'Enter' || e.key === ' ') {",
      [
        "                    if (!isLinking && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {",
        '                        e.preventDefault();',
        "                        const by = e.key === 'ArrowRight' ? 1 : -1;",
        '                        let startDate = task.startDate;',
        '                        let endDate = task.endDate;',
        '                        if (e.altKey) {',
        '                            const next = addDays(startDate, by);',
        '                            startDate = next > endDate ? endDate : next;',
        '                        } else if (e.shiftKey) {',
        '                            const next = addDays(endDate, by);',
        '                            endDate = next < startDate ? startDate : next;',
        '                        } else {',
        '                            startDate = addDays(startDate, by);',
        '                            endDate = addDays(endDate, by);',
        '                        }',
        '                        onDragCommit(task.id, startDate, endDate);',
        '                        return;',
        '                    }',
        "                    if (e.key === 'Enter' || e.key === ' ') {",
      ].join('\n'));
    return s;
  });

  edit(path.join(components, 'GanttChart.tsx'), s => {
    s = swap(s,
      'Math.floor((viewport.clientWidth - 12) / days)',
      'Math.round(((viewport.clientWidth - 12) / days) * 100) / 100');
    s = swap(s, 'const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);',
      'const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);\n    const [showDetails, setShowDetails] = useState(false);');
    s = swap(s, '                        <ViewControls \n',
      [
        '                        {selectedTaskId && (',
        '                            <button type="button" className="benchline-gantt-fit" onClick={() => setShowDetails(true)} title="Edit dates and task details">Edit task</button>',
        '                        )}',
        '                        <ViewControls ',
        '',
      ].join('\n'));
    s = swap(s, '            {selectedTaskId && (\n                <div className="absolute top-0',
      '            {selectedTaskId && showDetails && (\n                <div className="absolute top-0');
    s = swap(s, 'onClose={() => setSelectedTaskId(null)}',
      'onClose={() => { setShowDetails(false); setSelectedTaskId(null); }}');
    // Keep the time-scale dropdown first, so it stays in view on small screens.
    const controlStart = s.indexOf('                        <ViewControls \n');
    const controlEnd = s.indexOf('                        />', controlStart);
    if (controlStart < 0 || controlEnd < 0) throw Error('Gantt time-scale control missing');
    const control = s.slice(controlStart, controlEnd + '                        />'.length);
    s = s.slice(0, controlStart) + s.slice(controlEnd + '                        />'.length);
    s = swap(s,
      '<div className="benchline-gantt-actions flex items-center gap-2.5">\n',
      '<div className="benchline-gantt-actions flex items-center gap-2.5">\n' + control + '\n');
    return s;
  });
}

module.exports = { patchHostedGantt, swap };
