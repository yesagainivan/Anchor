import { ScheduledTask, Task } from '../types';
import { differenceInDays, parseISO, format, addDays } from 'date-fns';

interface TimelineProps {
    tasks: ScheduledTask[];
    definitions: Task[];
}

export function Timeline({ tasks, definitions }: TimelineProps) {
    if (tasks.length === 0) {
        return (
            <div className="p-8 bg-white rounded-xl shadow-sm md:mt-0 text-center border border-gray-200 h-full flex flex-col items-center justify-center">
                <div className="text-gray-400 text-lg mb-2">No timeline generated yet</div>
                <p className="text-sm text-gray-500">Create a plan to see your retro-schedule here.</p>
            </div>
        );
    }

    // Sort tasks by start date
    const sortedTasks = [...tasks].sort((a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    const minDate = parseISO(sortedTasks[0].start_date);
    const maxDate = parseISO(sortedTasks[sortedTasks.length - 1].end_date);
    // Add some padding
    const totalDays = differenceInDays(maxDate, minDate) + 5;

    // Helper to get vertical position (center of bar)
    const getTaskIndex = (id: string) => sortedTasks.findIndex(t => t.id === id);
    const ROW_HEIGHT = 45; // Height of each task row including margin
    const BAR_TOP_OFFSET = 24; // Distance from top of row to center of bar
    const totalHeight = sortedTasks.length * ROW_HEIGHT + 20;

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-4 md:mt-0 overflow-hidden">
            <h2 className="text-xl font-bold mb-6 text-gray-900 border-b pb-4">Timeline View <span className="text-xs font-normal text-gray-500 ml-2">(Critical Path)</span></h2>

            <div className="relative" style={{ height: totalHeight }}>
                {/* SVG Layer for connectors */}
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-0"
                    viewBox={`0 0 100 ${totalHeight}`}
                    preserveAspectRatio="none"
                >
                    <defs>
                        <marker id="arrowhead" markerWidth="6" markerHeight="7" refX="0" refY="3.5" orient="auto">
                            <polygon points="0 0, 6 3.5, 0 7" fill="#94a3b8" />
                        </marker>
                    </defs>
                    {sortedTasks.map(task => {
                        const successors = definitions.filter(d => d.dependencies.includes(task.id));
                        return successors.map(succ => {
                            const succTask = tasks.find(t => t.id === succ.id);
                            if (!succTask) return null;

                            const startIdx = getTaskIndex(task.id);
                            const endIdx = getTaskIndex(succ.id);

                            // Calculate Coordinates in 0-100 X space and Pixel Y space
                            const startTaskEnd = parseISO(task.end_date);
                            const succTaskStart = parseISO(succTask.start_date);

                            const x1 = ((differenceInDays(startTaskEnd, minDate)) / totalDays) * 100;
                            const x2 = ((differenceInDays(succTaskStart, minDate)) / totalDays) * 100;

                            const y1 = startIdx * ROW_HEIGHT + BAR_TOP_OFFSET;
                            const y2 = endIdx * ROW_HEIGHT + BAR_TOP_OFFSET;

                            return (
                                <path
                                    key={`${task.id}-${succ.id}`}
                                    d={`M ${x1} ${y1} C ${x1 + 2} ${y1}, ${x2 - 2} ${y2}, ${x2} ${y2}`}
                                    fill="none"
                                    stroke="#cbd5e1"
                                    strokeWidth="0.5" // Thinner because applied to stretched space? No, vector-effect could help but simple is fine.
                                    vectorEffect="non-scaling-stroke"
                                    markerEnd="url(#arrowhead)"
                                />
                            );
                        });
                    })}
                </svg>

                {sortedTasks.map((task, index) => {
                    const start = parseISO(task.start_date);
                    const end = parseISO(task.end_date);
                    const offset = differenceInDays(start, minDate);
                    const duration = differenceInDays(end, start) || 1;

                    const leftPct = (offset / totalDays) * 100;
                    const widthPct = (duration / totalDays) * 100;

                    return (
                        <div
                            key={task.id}
                            className="absolute w-full group"
                            style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                        >
                            <div className="flex justify-between text-xs mb-1 px-1">
                                <span className="font-semibold text-gray-700 truncate w-32">{task.name}</span>
                                <span className="text-gray-400 font-mono">{task.start_date}</span>
                            </div>

                            <div className="h-full w-full relative">
                                <div
                                    className="absolute h-3 bg-blue-500 rounded-full shadow-sm z-10 transition-all hover:bg-blue-600 hover:scale-y-125 cursor-pointer"
                                    style={{
                                        left: `${leftPct}%`,
                                        width: `${Math.max(widthPct, 0.5)}%`, // Minimum width for visibility
                                        top: '2px'
                                    }}
                                    title={`${task.name}: ${task.start_date} to ${task.end_date}`}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between text-xs text-gray-400 uppercase tracking-wide">
                <span>{format(minDate, 'MMM d')}</span>
                <span>{format(addDays(minDate, totalDays), 'MMM d, yyyy')}</span>
            </div>
        </div>
    );
}
