import { ScheduledTask, Task } from '../types';
import { differenceInDays, parseISO, format, addDays, isToday, isBefore } from 'date-fns';

interface TimelineProps {
    tasks: ScheduledTask[];
    definitions: Task[];
}

const LABEL_WIDTH = 140;

export function Timeline({ tasks, definitions }: TimelineProps) {
    if (tasks.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-surface rounded-xl border border-border">
                <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-text mb-1">No schedule yet</h3>
                <p className="text-sm text-text-muted max-w-xs">
                    Add tasks and set a deadline to generate your backwards schedule.
                </p>
            </div>
        );
    }

    const sortedTasks = [...tasks].sort((a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    const minDate = parseISO(sortedTasks[0].start_date);
    const maxDate = parseISO(sortedTasks[sortedTasks.length - 1].end_date);
    const totalDays = differenceInDays(maxDate, minDate) + 3;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ROW_HEIGHT = 48;
    const totalHeight = sortedTasks.length * ROW_HEIGHT;

    const getTaskIndex = (id: string) => sortedTasks.findIndex(t => t.id === id);

    const dateMarkers: { date: Date; pct: number }[] = [];
    const markerCount = Math.min(5, totalDays);
    for (let i = 0; i <= markerCount; i++) {
        const dayOffset = Math.round((i / markerCount) * (totalDays - 2));
        const date = addDays(minDate, dayOffset);
        dateMarkers.push({
            date,
            pct: (dayOffset / totalDays) * 100
        });
    }

    const todayOffset = differenceInDays(today, minDate);
    const todayPct = todayOffset >= 0 && todayOffset <= totalDays ? (todayOffset / totalDays) * 100 : null;

    return (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
            {/* Header row */}
            <div className="flex border-b border-border-muted bg-surface-alt">
                <div className="shrink-0 px-4 py-2 text-xs font-medium text-text-muted uppercase" style={{ width: LABEL_WIDTH }}>
                    Task
                </div>
                <div className="flex-1 relative h-10">
                    {dateMarkers.map(({ date, pct }, i) => (
                        <div
                            key={i}
                            className="absolute top-0 h-full flex items-center"
                            style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                        >
                            <span className={`text-xs font-medium whitespace-nowrap ${isToday(date) ? 'text-brand' : 'text-text-faint'
                                }`}>
                                {format(date, 'MMM d')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Task rows */}
            <div className="relative" style={{ height: totalHeight }}>
                {/* Grid lines layer */}
                <div className="absolute top-0 bottom-0 right-0" style={{ left: LABEL_WIDTH }}>
                    {dateMarkers.map(({ pct }, i) => (
                        <div
                            key={i}
                            className="absolute top-0 bottom-0 border-l border-border-muted"
                            style={{ left: `${pct}%` }}
                        />
                    ))}

                    {todayPct !== null && (
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-danger z-20"
                            style={{ left: `${todayPct}%` }}
                        >
                            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-danger" />
                        </div>
                    )}

                    {/* SVG Connectors */}
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none z-10"
                        viewBox={`0 0 100 ${totalHeight}`}
                        preserveAspectRatio="none"
                    >
                        {sortedTasks.map(task => {
                            const successors = definitions.filter(d => d.dependencies.includes(task.id));
                            return successors.map(succ => {
                                const succTask = tasks.find(t => t.id === succ.id);
                                if (!succTask) return null;

                                const startIdx = getTaskIndex(task.id);
                                const endIdx = getTaskIndex(succ.id);

                                const taskEnd = parseISO(task.end_date);
                                const succStart = parseISO(succTask.start_date);

                                const x1 = (differenceInDays(taskEnd, minDate) / totalDays) * 100;
                                const x2 = (differenceInDays(succStart, minDate) / totalDays) * 100;
                                const y1 = startIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                                const y2 = endIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

                                return (
                                    <path
                                        key={`${task.id}-${succ.id}`}
                                        d={`M ${x1} ${y1} C ${x1 + 2} ${y1}, ${x2 - 2} ${y2}, ${x2} ${y2}`}
                                        fill="none"
                                        stroke="var(--color-border)"
                                        strokeWidth="1.5"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                );
                            });
                        })}
                    </svg>
                </div>

                {/* Rows */}
                {sortedTasks.map((task, index) => {
                    const start = parseISO(task.start_date);
                    const end = parseISO(task.end_date);
                    const offset = differenceInDays(start, minDate);
                    const duration = differenceInDays(end, start) || 1;

                    const leftPct = (offset / totalDays) * 100;
                    const widthPct = (duration / totalDays) * 100;

                    const isPast = isBefore(end, today);

                    return (
                        <div
                            key={task.id}
                            className={`absolute left-0 right-0 flex ${index % 2 === 0 ? 'bg-surface' : 'bg-surface-alt/50'
                                }`}
                            style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                        >
                            <div
                                className="shrink-0 px-4 flex flex-col justify-center"
                                style={{ width: LABEL_WIDTH }}
                            >
                                <span className={`text-sm font-medium truncate ${isPast ? 'text-text-faint' : 'text-text'
                                    }`}>
                                    {task.name}
                                </span>
                                <span className="text-xs text-text-faint">{duration}d</span>
                            </div>

                            <div className="flex-1 relative">
                                <div
                                    className={`absolute h-6 rounded-md shadow-sm transition-all cursor-pointer hover:brightness-110 z-10 ${isPast
                                            ? 'bg-text-faint'
                                            : 'bg-gradient-to-r from-brand to-brand-hover'
                                        }`}
                                    style={{
                                        left: `${leftPct}%`,
                                        width: `${Math.max(widthPct, 1.5)}%`,
                                        top: '50%',
                                        transform: 'translateY(-50%)'
                                    }}
                                    title={`${task.name}: ${format(start, 'MMM d')} – ${format(end, 'MMM d')}`}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
