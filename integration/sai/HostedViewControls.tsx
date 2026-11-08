import React from 'react';
import { GanttViewMode } from './ganttLayout';

interface ViewControlsProps {
    viewMode: GanttViewMode;
    onViewModeChange: (mode: GanttViewMode) => void;
    zoom: number;
    onZoomChange: (zoom: number) => void;
}

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 100;

const SCALES: { value: GanttViewMode; label: string }[] = [
    { value: 'day', label: 'Days' },
    { value: 'week', label: 'Weeks' },
    { value: 'month', label: 'Months' },
    { value: 'quarter', label: 'Quarters' },
    { value: 'year', label: 'Years' },
];

const ViewControls: React.FC<ViewControlsProps> = ({
    viewMode,
    onViewModeChange,
    zoom,
    onZoomChange,
}) => {
    const step = zoom < 1 ? 0.25 : zoom < 4 ? 0.5 : zoom < 10 ? 2 : zoom < 25 ? 5 : 10;
    return (
        <div className="benchline-gantt-scale-controls">
            <label htmlFor="benchline-gantt-scale" className="benchline-gantt-scale-label">
                Time scale
            </label>
            <select
                id="benchline-gantt-scale"
                aria-label="Gantt chart time scale"
                value={viewMode}
                onChange={(e) => onViewModeChange(e.target.value as GanttViewMode)}
                className="benchline-gantt-scale-select"
            >
                {SCALES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
            <div className="benchline-gantt-zoom" role="group" aria-label="Timeline zoom">
                <button
                    type="button"
                    aria-label="Zoom timeline out"
                    title="Zoom out"
                    onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom - step))}
                    disabled={zoom <= MIN_ZOOM}
                >−</button>
                <span title={`${zoom} pixels per day`} aria-live="off">Zoom</span>
                <button
                    type="button"
                    aria-label="Zoom timeline in"
                    title="Zoom in"
                    onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom + step))}
                    disabled={zoom >= MAX_ZOOM}
                >+</button>
            </div>
        </div>
    );
};

export default ViewControls;
