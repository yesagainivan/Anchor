import { ScheduledTask, Task } from '../types';
import { differenceInDays, parseISO, format, addDays, isToday, isBefore } from 'date-fns';

interface TimelineProps {
    tasks: ScheduledTask[];
    definitions: Task[];
}

export function Timeline({ tasks, definitions }: TimelineProps) {
    if (tasks.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-xl border border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No schedule yet</h3>
                <p className="text-sm text-gray-500 max-w-xs">
                    Add tasks and set a deadline to generate your backwards schedule.
                </p>
            </div>
        );
    }

    // Sort by start date
    const sortedTasks = [...tasks].sort((a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    const minDate = parseISO(sortedTasks[0].start_date);
    const maxDate = parseISO(sortedTasks[sortedTasks.length - 1].end_date);
    const totalDays = differenceInDays(maxDate, minDate) + 3;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ROW_HEIGHT = 52;
    const HEADER_HEIGHT = 40;
    const totalHeight = sortedTasks.length * ROW_HEIGHT + HEADER_HEIGHT;

    const getTaskIndex = (id: string) => sortedTasks.findIndex(t => t.id === id);

    // Generate date markers
    const dateMarkers: { date: Date; pct: number }[] = [];
    for (let i = 0; i <= totalDays; i += Math.max(1, Math.floor(totalDays / 6))) {
        const date = addDays(minDate, i);
        dateMarkers.push({
            date,
            pct: (i / totalDays) * 100
        });
    }

    // Today marker position
    const todayOffset = differenceInDays(today, minDate);
    const todayPct = todayOffset >= 0 && todayOffset <= totalDays ? (todayOffset / totalDays) * 100 : null;

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <div className="min-w-[600px]" style={{ height: totalHeight }}>
                    {/* Date header */}
                    <div className="relative h-10 border-b border-gray-100 bg-gray-50">
                        {dateMarkers.map(({ date, pct }, i) => (
                            <div
                                key={i}
                                className="absolute top-0 h-full flex items-center"
                                style={{ left: `${pct}%` }}
                            >
                                <span className={`text-xs font-medium px-2 ${isToday(date) ? 'text-blue-600' : 'text-gray-400'
                                    }`}>
                                    {format(date, 'MMM d')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Grid lines and Today marker */}
                    <div className="relative" style={{ height: totalHeight - HEADER_HEIGHT }}>
                        {/* Vertical grid lines */}
                        {dateMarkers.map(({ pct }, i) => (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 border-l border-gray-100"
                                style={{ left: `${pct}%` }}
                            />
                        ))}

                        {/* Today marker */}
                        {todayPct !== null && (
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-20"
                                style={{ left: `${todayPct}%` }}
                            >
                                <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-red-400" />
                            </div>
                        )}

                        {/* SVG Connectors */}
                        <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            viewBox={`0 0 100 ${totalHeight - HEADER_HEIGHT}`}
                            preserveAspectRatio="none"
                        >
                            <defs>
                                <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                    <path d="M 0 0 L 6 3 L 0 6 z" fill="#94a3b8" />
                                </marker>
                            </defs>
                            {sortedTasks.map(task => {
                                const successors = definitions.filter(d => d.dependencies.includes(task.id));
                                return successors.map(succ => {
                                    const succTask = tasks.find(t => t.id === succ.id);
                                    if (!succTask) return null;

                                    const startIdx = getTaskIndex(task.id);
                                    const endIdx = getTaskIndex(succ.id);

                                    const taskEnd = parseISO(task.end_date);
                                    const succStart = parseISO(succTask.start_date);

                                    // X in 0-100 viewBox space, Y in pixel space
                                    const x1 = (differenceInDays(taskEnd, minDate) / totalDays) * 100;
                                    const x2 = (differenceInDays(succStart, minDate) / totalDays) * 100;
                                    const y1 = startIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                                    const y2 = endIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

                                    return (
                                        <path
                                            key={`${task.id}-${succ.id}`}
                                            d={`M ${x1} ${y1} C ${x1 + 2} ${y1}, ${x2 - 2} ${y2}, ${x2} ${y2}`}
                                            fill="none"
                                            stroke="#cbd5e1"
                                            strokeWidth="0.5"
                                            vectorEffect="non-scaling-stroke"
                                            markerEnd="url(#arrow)"
                                        />
                                    );
                                });
                            })}
                        </svg>

                        {/* Task rows */}
                        {sortedTasks.map((task, index) => {
                            const start = parseISO(task.start_date);
                            const end = parseISO(task.end_date);
                            const offset = differenceInDays(start, minDate);
                            const duration = differenceInDays(end, start) || 1;

                            const leftPct = (offset / totalDays) * 100;
                            const widthPct = (duration / totalDays) * 100;

                            const isPast = isBefore(end, today);
                            const isActive = !isPast && isBefore(start, today);

                            return (
                                <div
                                    key={task.id}
                                    className={`absolute w-full flex items-center px-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                        }`}
                                    style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                                >
                                    {/* Task label */}
                                    <div className="w-32 shrink-0 pr-4">
                                        <span className={`text-sm font-medium truncate block ${isPast ? 'text-gray-400' : 'text-gray-700'
                                            }`}>
                                            {task.name}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {duration}d
                                        </span>
                                    </div>

                                    {/* Task bar area */}
                                    <div className="flex-1 relative h-full">
                                        <div
                                            className={`absolute h-7 rounded-lg shadow-sm transition-all cursor-pointer hover:scale-y-110 ${isPast
                                                ? 'bg-gray-300'
                                                : isActive
                                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                                    : 'bg-gradient-to-r from-blue-400 to-blue-500'
                                                }`}
                                            style={{
                                                left: `${leftPct}%`,
                                                width: `${Math.max(widthPct, 1)}%`,
                                                top: '50%',
                                                transform: 'translateY(-50%)'
                                            }}
                                            title={`${task.name}: ${format(start, 'MMM d')} – ${format(end, 'MMM d')}`}
                                        >
                                            {widthPct > 10 && (
                                                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white opacity-90">
                                                    {format(start, 'MMM d')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
