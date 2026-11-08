import React, { useMemo } from 'react';
import { ProjectData } from './types';

interface HostedCalendarOverviewProps {
    projectData: ProjectData;
    currentDate: Date;
    mode: 'quarter' | 'year';
    onChooseMonth: (date: Date) => void;
    onChooseDay: (date: Date) => void;
    visibleCalendars: { tasks: boolean; meetings: boolean; google: boolean; outlook: boolean };
}

const monthDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export default function HostedCalendarOverview({
    projectData, currentDate, mode, onChooseMonth, onChooseDay, visibleCalendars,
}: HostedCalendarOverviewProps) {
    const months = useMemo(() => {
        const base = mode === 'year'
            ? new Date(currentDate.getFullYear(), 0, 1)
            : new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3, 1);
        return Array.from({ length: mode === 'year' ? 12 : 3 }, (_, index) =>
            new Date(base.getFullYear(), base.getMonth() + index, 1));
    }, [currentDate, mode]);

    const isVisible = (source: string | undefined, kind: 'tasks' | 'meetings') => {
        if (source === 'google') return visibleCalendars.google;
        if (source === 'outlook') return visibleCalendars.outlook;
        return visibleCalendars[kind];
    };

    const monthData = useMemo(() => months.map(month => {
        const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
        const daysWithTasks = new Set<number>();
        const daysWithMeetings = new Set<number>();
        let taskCount = 0;
        let meetingCount = 0;
        for (const task of projectData.tasks || []) {
            if (!isVisible(task.source, 'tasks')) continue;
            const first = new Date(task.startDate);
            const last = new Date(task.endDate);
            const firstDay = new Date(first.getFullYear(), first.getMonth(), first.getDate());
            const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
            const effectiveStart = firstDay > month ? firstDay : month;
            const effectiveEnd = lastDay < end ? lastDay : new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
            if (effectiveStart > effectiveEnd) continue;
            taskCount++;
            for (let date = new Date(effectiveStart); date <= effectiveEnd; date.setDate(date.getDate() + 1)) {
                daysWithTasks.add(date.getDate());
            }
        }
        for (const meeting of projectData.meetings || []) {
            if (!isVisible(meeting.source, 'meetings')) continue;
            const date = new Date(meeting.date);
            if (sameMonth(date, month)) {
                meetingCount++;
                daysWithMeetings.add(date.getDate());
            }
        }
        return { taskCount, meetingCount, daysWithTasks, daysWithMeetings };
    }), [months, projectData.tasks, projectData.meetings, visibleCalendars]);

    const today = new Date();
    return (
        <div className={`benchline-calendar-overview benchline-calendar-overview-${mode}`} role="region" aria-label={mode === 'year' ? 'Year calendar' : 'Quarter calendar'}>
            <div className="benchline-calendar-overview-grid">
                {months.map((month, index) => {
                    const { taskCount, meetingCount, daysWithTasks, daysWithMeetings } = monthData[index];
                    const weekdayOffset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
                    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
                    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                    return (
                        <section key={month.toISOString()} className="benchline-calendar-month-panel">
                            <button type="button" onClick={() => onChooseMonth(month)} className="benchline-calendar-month-title" title="Open monthly calendar">
                                <span>{month.toLocaleDateString('en-GB', { month: 'long' })}</span>
                                <span className="benchline-calendar-month-year">{month.getFullYear()}</span>
                            </button>
                            <div className="benchline-calendar-month-labels" aria-hidden="true">
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <span key={i}>{day}</span>)}
                            </div>
                            <div className="benchline-calendar-month-days">
                                {Array.from({ length: weekdayOffset }, (_, i) => <span key={`gap-${i}`} aria-hidden="true" />)}
                                {days.map(day => {
                                    const date = new Date(month.getFullYear(), month.getMonth(), day);
                                    const isToday = date.toDateString() === today.toDateString();
                                    const task = daysWithTasks.has(day);
                                    const meeting = daysWithMeetings.has(day);
                                    return (
                                        <button
                                            type="button"
                                            key={day}
                                            onClick={() => onChooseDay(date)}
                                            className={`benchline-calendar-month-day ${isToday ? 'is-today' : ''}`}
                                            aria-label={`${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}${task ? ', tasks' : ''}${meeting ? ', meetings' : ''}`}
                                        >
                                            <span>{day}</span>
                                            <i className="benchline-calendar-day-dots" aria-hidden="true">
                                                {task && <i className="benchline-calendar-dot-task" />}
                                                {meeting && <i className="benchline-calendar-dot-meeting" />}
                                            </i>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="benchline-calendar-month-summary">
                                <span>{taskCount} {taskCount === 1 ? 'task' : 'tasks'}</span>
                                <span>{meetingCount} {meetingCount === 1 ? 'meeting' : 'meetings'}</span>
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
