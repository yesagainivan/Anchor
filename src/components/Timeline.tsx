import { useState, useCallback, useRef, useEffect } from 'react';
import { ScheduledTask, Task } from '../types';
import { differenceInDays, parseISO, format, addDays, isToday, isBefore } from 'date-fns';
import { TodayIcon, FireIcon, MemoIcon, DiamondIcon } from './icons';
import { TaskHoverCard } from './TaskHoverCard';

interface TimelineProps {
    tasks: ScheduledTask[];
    definitions: Task[];
    onOpenDetails?: (taskId: string) => void;
}

const LABEL_WIDTH = 140;
const MIN_PIXELS_PER_DAY = 10;
const MAX_PIXELS_PER_DAY = 200;

export function Timeline({ tasks, definitions, onOpenDetails }: TimelineProps) {
    // const containerRef = useRef<HTMLDivElement>(null); // Replaced by callback ref
    const [hasOverflow, setHasOverflow] = useState(false);
    const [showToday, setShowToday] = useState(false);
    const [showCriticalPath, setShowCriticalPath] = useState(false);
    const [pixelsPerDay, setPixelsPerDay] = useState<number | 'fit'>(() => {
        const saved = localStorage.getItem('anchor_zoom_level');
        if (saved && saved !== 'fit') {
            const parsed = parseFloat(saved);
            return isNaN(parsed) ? 'fit' : parsed;
        }
        return (saved as 'fit') || 'fit';
    });
    const [containerWidth, setContainerWidth] = useState(0);

    // Persist zoom level
    useEffect(() => {
        localStorage.setItem('anchor_zoom_level', String(pixelsPerDay));
    }, [pixelsPerDay]);

    // Hover state
    const [hoveredTask, setHoveredTask] = useState<{
        task: ScheduledTask;
        position: { x: number; y: number }
    } | null>(null);

    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleTaskMouseEnter = (task: ScheduledTask, rect: DOMRect) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        setHoveredTask({
            task,
            position: { x: rect.right, y: rect.top }
        });
    };

    const handleTaskMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredTask(null);
        }, 150); // Small delay to allow moving to card
    };

    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const checkOverflow = () => {
            const node = containerRef.current;
            if (node) {
                setHasOverflow(node.scrollHeight > node.clientHeight);
            }
        };
        checkOverflow();
    }, [tasks, containerWidth]); // Re-check when tasks change or width changes



    // Better approach: plain LayoutEffect with state tracking or Ref that holds the observer
    const observerRef = useRef<ResizeObserver | null>(null);
    const setContainerRef = useCallback((node: HTMLDivElement | null) => {
        containerRef.current = node;

        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }

        if (node) {
            setContainerWidth(node.clientWidth);
            observerRef.current = new ResizeObserver(() => {
                setContainerWidth(node.clientWidth);
            });
            observerRef.current.observe(node);
        }
    }, []);

    if (tasks.length === 0) {
        return (
            <div className="timeline-scroll-container">
                <div className="flex flex-col items-center justify-center text-center p-12 bg-surface rounded-xl border border-border">
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
            </div>
        );
    }

    const sortedTasks = [...tasks].sort((a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const firstTaskStart = parseISO(sortedTasks[0].start_date);
    firstTaskStart.setHours(0, 0, 0, 0); // Align to midnight

    // Find the latest end date among all tasks
    const lastTaskEnd = tasks.reduce((max, t) => {
        const end = parseISO(t.end_date);
        return isBefore(max, end) ? end : max;
    }, parseISO(tasks[0].end_date));

    // When showToday is ON and today is before first task, extend range to include today
    const rangeStart = showToday && isBefore(today, firstTaskStart) ? today : firstTaskStart;

    // Ensure range covers full days for the end date too
    const rangeEnd = new Date(lastTaskEnd);
    if (rangeEnd.getHours() !== 0 || rangeEnd.getMinutes() !== 0) {
        rangeEnd.setHours(0, 0, 0, 0);
        rangeEnd.setDate(rangeEnd.getDate() + 1);
    } else {
        // If it ends exactly at midnight (unlikely for task end, usually end of day is 23:59 or we interpret it as up to)
        // If `lastTaskEnd` is effectively "end of day", it might be T23:59:59.
        rangeEnd.setHours(0, 0, 0, 0);
        rangeEnd.setDate(rangeEnd.getDate() + 1);
    }

    // Total duration in ms
    const diffMs = rangeEnd.getTime() - rangeStart.getTime();
    const totalDays = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 1);
    const totalMs = totalDays * 24 * 60 * 60 * 1000;

    // Calculate buffer zone (days between today and first task)
    const bufferDays = showToday && isBefore(today, firstTaskStart)
        ? differenceInDays(firstTaskStart, today)
        : 0;
    const bufferPct = (bufferDays / totalDays) * 100;

    const ROW_HEIGHT = 48;
    const totalHeight = sortedTasks.length * ROW_HEIGHT;

    // Zoom Logic
    // Default to at least something reasonable if width is 0 (initial mount)
    const timelineWidth = Math.max(0, (containerWidth || 800) - LABEL_WIDTH);

    // If 'fit', calculate pixels per day based on container width
    // If specific number, use that
    const effectivePixelsPerDay = pixelsPerDay === 'fit'
        ? timelineWidth / totalDays
        : pixelsPerDay;

    const totalWidth = effectivePixelsPerDay * totalDays;

    // If we're larger than 'fit', we need to set a width on the content container
    const contentWidth = Math.max(timelineWidth, totalWidth);

    const getTaskIndex = (id: string) => sortedTasks.findIndex(t => t.id === id);

    const dateMarkers: { date: Date; left: number }[] = [];

    // Dynamic marker density based on zoom level
    let markerStep = 1; // days
    if (effectivePixelsPerDay < 15) markerStep = 14; // every 2 weeks
    else if (effectivePixelsPerDay < 30) markerStep = 7; // weekly
    else if (effectivePixelsPerDay < 60) markerStep = 2; // every other day

    for (let i = 0; i < totalDays; i += markerStep) {
        const date = addDays(rangeStart, i);
        dateMarkers.push({
            date,
            left: (i / totalDays) * 100 // still use % for relative inside the stretched container
        });
    }

    const todayOffsetMs = now.getTime() - rangeStart.getTime();
    const todayPct = todayOffsetMs >= 0 && todayOffsetMs <= totalMs ? (todayOffsetMs / totalMs) * 100 : null;

    const handleZoomIn = () => {
        const current = pixelsPerDay === 'fit' ? effectivePixelsPerDay : pixelsPerDay;
        setPixelsPerDay(Math.min(MAX_PIXELS_PER_DAY, current * 1.25));
    };

    const handleZoomOut = () => {
        const current = pixelsPerDay === 'fit' ? effectivePixelsPerDay : pixelsPerDay;
        setPixelsPerDay(Math.max(MIN_PIXELS_PER_DAY, current * 0.8));
    };


    return (
        <div className="relative h-full flex flex-col bg-surface rounded-xl border border-border overflow-hidden">
            {/* ... toolbar ... */}
            <div className="absolute  bottom-4 right-4 z-50 flex items-center gap-2 bg-surface-alt/20 backdrop-blur-sm border border-border shadow-sm p-1.5 rounded-lg select-none">
                {/* Zoom Controls */}
                <div className="flex items-center gap-0.5 border-r border-border-muted pr-2 mr-1">
                    <button
                        onClick={handleZoomOut}
                        className="p-1 hover:bg-surface rounded text-text-faint hover:text-text-muted transition-colors"
                        title="Zoom Out"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                    </button>
                    <button
                        onClick={() => setPixelsPerDay('fit')}
                        className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded hover:bg-surface transition-colors ${pixelsPerDay === 'fit' ? 'text-brand' : 'text-text-faint hover:text-text-muted'}`}
                        title="Fit to view"
                    >
                        Fit
                    </button>
                    <button
                        onClick={handleZoomIn}
                        className="p-1 hover:bg-surface rounded text-text-faint hover:text-text-muted transition-colors"
                        title="Zoom In"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                </div>
                {/* Toggles */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowCriticalPath(!showCriticalPath)}
                        title={showCriticalPath ? 'Hide Critical Path' : 'Show Critical Path'}
                        className={`p-1 rounded transition-colors ${showCriticalPath
                            ? 'text-danger bg-danger/10'
                            : 'text-text-faint hover:text-text-muted hover:bg-surface'}`}
                    >
                        <FireIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowToday(!showToday)}
                        title={showToday ? 'Hide buffer to today' : 'Show buffer from today'}
                        className={`p-1 rounded transition-colors ${showToday
                            ? 'text-brand bg-brand/10'
                            : 'text-text-faint hover:text-text-muted hover:bg-surface'}`}
                    >
                        <TodayIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Scroll Container */}
            <div
                ref={setContainerRef}
                className={`timeline-scroll-container overflow-auto flex-1 w-full h-full ${hasOverflow ? 'has-overflow' : ''}`}
            >
                <div className="flex flex-col min-w-fit h-full relative">
                    {/* Header row */}
                    <div className="flex border-b border-border-muted bg-surface-alt shrink-0 z-30 sticky top-0" style={{ width: LABEL_WIDTH + contentWidth }}>
                        <div className="shrink-0 px-4 py-2 flex items-center justify-between border-r border-border-muted sticky left-0 bg-surface-alt z-40" style={{ width: LABEL_WIDTH }}>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-text-muted uppercase">Task</span>
                                {tasks.length > 0 && (
                                    <span className="text-[10px] font-semibold text-brand bg-brand/10 px-1.5 py-0.5 rounded-full">
                                        {Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)}%
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Header Timeline Track */}
                        <div className="overflow-hidden flex-1 relative h-10">
                            <div style={{ width: contentWidth, height: '100%', position: 'relative' }} className="border-r border-border-muted/50">
                                {dateMarkers.map(({ date, left }, i) => (
                                    <div
                                        key={i}
                                        className="absolute top-0 h-full flex items-center pl-2 border-l border-border-muted/50"
                                        style={{ left: `${left}%` }}
                                    >
                                        <span className={`text-xs font-medium whitespace-nowrap ${isToday(date) ? 'text-brand' : 'text-text-faint'}`}>
                                            {format(date, 'd')}
                                            <span className="text-[10px] ml-0.5 opacity-75">{format(date, 'MMM')}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Task rows container */}
                    <div className="relative" style={{ height: totalHeight, width: LABEL_WIDTH + contentWidth }}>
                        {/* Grid lines layer */}
                        <div className="absolute top-0 bottom-0 right-0 border-r border-border-muted" style={{ left: LABEL_WIDTH }}>
                            {dateMarkers.map(({ left }, i) => (
                                <div
                                    key={i}
                                    className="absolute top-0 bottom-0 border-l border-border-muted"
                                    style={{ left: `${left}%` }}
                                />
                            ))}

                            {todayPct !== null && (
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-danger z-30"
                                    style={{ left: `${todayPct}%` }}
                                >
                                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-danger" />
                                </div>
                            )}

                            {/* Buffer zone */}
                            {bufferPct > 0 && (
                                <div
                                    className="absolute top-0 bottom-0 z-5"
                                    style={{
                                        left: `${todayPct}%`,
                                        width: `${bufferPct}%`,
                                        background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, var(--color-success) 4px, var(--color-success) 5px)',
                                        opacity: 0.15
                                    }}
                                    title={`${bufferDays} day${bufferDays !== 1 ? 's' : ''} buffer before work starts`}
                                />
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

                                        const isCriticalLink = showCriticalPath && task.is_critical && succTask.is_critical;

                                        const startIdx = getTaskIndex(task.id);
                                        const endIdx = getTaskIndex(succ.id);

                                        const taskEnd = parseISO(task.end_date);
                                        const succStart = parseISO(succTask.start_date);

                                        const x1 = ((taskEnd.getTime() - rangeStart.getTime()) / totalMs) * 100;
                                        const x2 = ((succStart.getTime() - rangeStart.getTime()) / totalMs) * 100;
                                        const y1 = startIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                                        const y2 = endIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

                                        return (
                                            <path
                                                key={`${task.id}-${succ.id}`}
                                                d={`M ${x1} ${y1} C ${x1 + 2} ${y1}, ${x2 - 2} ${y2}, ${x2} ${y2}`}
                                                fill="none"
                                                stroke={isCriticalLink ? "var(--color-danger)" : "var(--color-border)"}
                                                strokeWidth={isCriticalLink ? "2" : "1.5"}
                                                strokeOpacity={isCriticalLink ? "0.8" : "1"}
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
                            const offsetMs = start.getTime() - rangeStart.getTime();
                            // Calculated float duration for bar width
                            const durationMs = end.getTime() - start.getTime();


                            const leftPct = (offsetMs / totalMs) * 100;
                            const widthPct = (durationMs / totalMs) * 100;

                            const isPast = isBefore(end, today);

                            // Label logic
                            let durationLabel = '';
                            const days = differenceInDays(end, start);
                            if (days >= 1) {
                                durationLabel = `${days}d`;
                            } else {
                                const hours = Math.round(durationMs / (1000 * 60 * 60) * 10) / 10;
                                durationLabel = `${hours}h`;
                            }

                            // Determine bar color class
                            let barClass = 'bg-gradient-to-r from-brand to-brand-hover';
                            if (task.completed) {
                                barClass = 'bg-success opacity-90';
                            } else if (showCriticalPath && task.is_critical) {
                                barClass = 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]';
                            } else if (isPast) {
                                barClass = 'bg-text-faint';
                            }

                            // Milestone Styling
                            if (task.is_milestone) {
                                barClass = task.completed
                                    ? 'bg-success border-2 border-surface shadow-lg'
                                    : 'bg-purple-500 border-2 border-surface shadow-lg';
                            }

                            const stickyBgClass = index % 2 === 0 ? 'bg-surface/70 backdrop-blur-xs shadow-[2px_0px_4px_rgba(0,0,0,0.1)]' : 'bg-surface-alt/70 backdrop-blur-xs shadow-[2px_0px_4px_rgba(0,0,0,0.1)]';

                            return (
                                <div
                                    key={task.id}
                                    className={`absolute left-0 right-0 flex ${index % 2 === 0 ? 'bg-surface' : 'bg-surface-alt/50'}`}
                                    style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT, width: LABEL_WIDTH + contentWidth }}
                                >
                                    <div
                                        className={`shrink-0 px-4 flex flex-col justify-center border-r border-border-muted/50 sticky left-0 z-20 ${stickyBgClass}`}
                                        style={{ width: LABEL_WIDTH }}
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {task.is_milestone && (
                                                <div className="w-2 h-2 rotate-45 bg-purple-500 shrink-0" />
                                            )}
                                            <span className={`text-sm font-medium truncate ${isPast && !(showCriticalPath && task.is_critical) ? 'text-text-faint' : 'text-text'
                                                } ${showCriticalPath && task.is_critical && !task.completed ? 'text-danger' : ''}`}
                                                title={task.name}
                                            >
                                                {task.name}
                                            </span>
                                            {task.notes && (
                                                <span className="text-text-faint flex-shrink-0" title="Has notes">
                                                    <MemoIcon className="w-3 h-3" />
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-text-faint">{durationLabel}</span>
                                    </div>

                                    <div className="flex-1 relative">
                                        <div
                                            className={`absolute h-6 rounded-md shadow-sm transition-all cursor-pointer hover:brightness-110 z-10 ${barClass} flex items-center justify-center`}
                                            style={{
                                                left: `${leftPct}%`,
                                                width: `${Math.max(widthPct, 0.5)}%`,
                                                top: '50%',
                                                transform: 'translateY(-50%)'
                                            }}
                                            onMouseEnter={(e) => {
                                                handleTaskMouseEnter(task, e.currentTarget.getBoundingClientRect());
                                            }}
                                            onMouseLeave={handleTaskMouseLeave}
                                            onClick={() => onOpenDetails?.(task.id)}
                                        >
                                            {task.is_milestone && (
                                                <DiamondIcon className="w-3.5 h-3.5 text-white/90 drop-shadow-sm" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Hover Card Portal */}
                {
                    hoveredTask && (
                        <TaskHoverCard
                            task={hoveredTask.task}
                            definition={definitions.find(d => d.id === hoveredTask.task.id)}
                            position={hoveredTask.position}
                            getTask={(id) => tasks.find(t => t.id === id)}
                            onMouseEnter={() => {
                                if (hoverTimeoutRef.current) {
                                    clearTimeout(hoverTimeoutRef.current);
                                    hoverTimeoutRef.current = null;
                                }
                            }}
                            onMouseLeave={handleTaskMouseLeave}
                        />
                    )
                }
            </div>
        </div>
    );
}
