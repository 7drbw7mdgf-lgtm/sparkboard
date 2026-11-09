const calendarDay = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;

export interface Point {
  x: number;
  y: number;
}

// Bars and links use the same rendered geometry, including the low-zoom hit target.
export function taskBarGeometry(
  projectStart: Date,
  task: { startDate: Date; endDate: Date },
  zoom: number,
) {
  return {
    left: (calendarDay(task.startDate) - calendarDay(projectStart)) * zoom,
    width: Math.max((calendarDay(task.endDate) - calendarDay(task.startDate) + 1) * zoom, 6),
  };
}

/** Finish-to-start routing in timeline content pixels; scrolling never changes this space. */
export function dependencyRoute(start: Point, end: Point) {
  const clearance = 16;
  // Compact task labels start 8px beyond the bar: turn before reaching the text.
  const exitX = start.x + 4;
  let points: Point[];
  if (end.x - start.x >= clearance * 2) {
    const bendX = exitX;
    points = [start, { x: bendX, y: start.y }, { x: bendX, y: end.y }, end];
  } else {
    // Close, overlapping and backwards dates need a return lane outside both bars.
    // Task bars are 36px high in 60px rows: +/-26 stays in the row gutter.
    const laneY = start.y + (end.y >= start.y ? 26 : -26);
    const entryX = end.x - clearance;
    points = [
      start,
      { x: exitX, y: start.y },
      { x: exitX, y: laneY },
      { x: entryX, y: laneY },
      { x: entryX, y: end.y },
      end,
    ];
  }

  // Locate the removal control halfway along the actual polyline, not an old Bezier.
  const lengths = points
    .slice(1)
    .map((point, i) => Math.abs(point.x - points[i].x) + Math.abs(point.y - points[i].y));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2;
  let midpoint = start;
  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i];
    if (remaining <= length && length > 0) {
      const ratio = remaining / length;
      midpoint = {
        x: points[i].x + (points[i + 1].x - points[i].x) * ratio,
        y: points[i].y + (points[i + 1].y - points[i].y) * ratio,
      };
      break;
    }
    remaining -= length;
  }
  return {
    points,
    midpoint,
    path: points.map((point, i) => `${i ? 'L' : 'M'} ${point.x} ${point.y}`).join(' '),
  };
}
