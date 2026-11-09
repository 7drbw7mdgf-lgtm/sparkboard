'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { swap } = require('./patch-sai-gantt.cjs');

function patchHostedDependencies(root) {
  const edit = (name, transform) => {
    const filename = path.join(root, 'components', name);
    fs.writeFileSync(filename, transform(fs.readFileSync(filename, 'utf8')));
  };
  edit('Timeline.tsx', (s) => {
    s = swap(
      s,
      "import DependencyLines from './DependencyLines';",
      "import DependencyLines from '../HostedDependencyLines';",
    );
    // Space for return elbows at day zero and after the final task, without clipping.
    s = swap(
      s,
      'Math.max(projectDays * zoom, viewportWidth)',
      'Math.max(projectDays * zoom, viewportWidth - 64)',
    );
    s = swap(
      s,
      "style={{ width: timelineWidth, overflowX: 'clip' }}",
      "style={{ width: timelineWidth + 64, paddingLeft: 32, paddingRight: 32, overflowX: 'clip' }}",
    );
    return s;
  });
  edit('GanttTaskBar.tsx', (s) => {
    s = swap(
      s,
      "import { DragPreview } from './ganttLayout';",
      "import { DragPreview } from './ganttLayout';\nimport { taskBarGeometry } from '../HostedGanttGeometry';",
    );
    s = swap(
      s,
      '    const barWidth = Math.max(taskDuration * zoom, 6);',
      '    const { left: barLeft, width: barWidth } = taskBarGeometry(projectStartDate, task, zoom);',
    );
    s = swap(s, 'left: taskStartOffset * zoom,', 'left: barLeft,');
    // If the timeline pans during a drag, convert pointer movement to content movement.
    s = swap(
      s,
      '        const startX = e.clientX;',
      "        const startX = e.clientX;\n        const viewport = e.currentTarget.closest('.gantt-timeline');\n        const startScroll = viewport?.scrollLeft ?? 0;",
    );
    s = swap(
      s,
      'const dx = moveEvent.clientX - startX;',
      'const dx = moveEvent.clientX - startX + (viewport?.scrollLeft ?? 0) - startScroll;',
    );
    s = swap(
      s,
      '        const handleMouseMove = (moveEvent: PointerEvent) => {\n            if (moveEvent.pointerId !== pointerId) return;\n            const dx =',
      '        let lastClientX = startX;\n        const handleScroll = () => handleMouseMove({ pointerId, clientX: lastClientX } as PointerEvent);\n        const handleMouseMove = (moveEvent: PointerEvent) => {\n            if (moveEvent.pointerId !== pointerId) return;\n            lastClientX = moveEvent.clientX;\n            const dx =',
    );
    // Add/remove alongside the window listeners for commit and cancellation.
    s = s.replaceAll(
      "window.removeEventListener('pointermove', handleMouseMove);",
      "viewport?.removeEventListener('scroll', handleScroll);\n            window.removeEventListener('pointermove', handleMouseMove);",
    );
    s = swap(
      s,
      "        window.addEventListener('pointermove', handleMouseMove);",
      "        viewport?.addEventListener('scroll', handleScroll);\n        window.addEventListener('pointermove', handleMouseMove);",
    );
    return s;
  });
  edit('GanttChart.tsx', (s) => {
    s = swap(
      s,
      '(task.dependencies || []).forEach(depId => {',
      '[...new Set(task.dependencies || [])].forEach(depId => {',
    );
    s = swap(
      s,
      "import Timeline from './Timeline';",
      "import Timeline from './Timeline';\nimport { taskBarGeometry } from '../HostedGanttGeometry';",
    );
    s = swap(
      s,
      '                deps.push({',
      '                if (depId === task.id) return;\n                const sourceBar = taskBarGeometry(projectStartDate, sourceTask, currentZoom);\n                const targetBar = taskBarGeometry(projectStartDate, task, currentZoom);\n                deps.push({',
    );
    s = swap(
      s,
      'x: (diffInDays(projectStartDate, sourceTask.endDate) + 1) * currentZoom,',
      'x: sourceBar.left + sourceBar.width,',
    );
    s = swap(
      s,
      'x: diffInDays(projectStartDate, task.startDate) * currentZoom,',
      'x: targetBar.left,',
    );
    s = swap(
      s,
      '(el.scrollLeft + el.clientWidth / 2) / prevZoom',
      '(el.scrollLeft + el.clientWidth / 2 - 32) / prevZoom',
    );
    s = swap(
      s,
      'centerDay * currentZoom - el.clientWidth / 2',
      '32 + centerDay * currentZoom - el.clientWidth / 2',
    );
    return s;
  });
}
module.exports = { patchHostedDependencies };
