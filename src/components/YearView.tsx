import {
    format,
    startOfYear,
    endOfYear,
    eachMonthOfInterval,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    startOfWeek,
    endOfWeek,
    parseISO
} from 'date-fns';
import { useMemo, memo, useRef } from 'react';
import { ScheduledTask } from '../types';

// Task Status Priority: Critical > Milestone > Completed > Normal
type DayStatus = 'critical' | 'milestone' | 'completed' | 'normal';

interface DayData {
    status: DayStatus;
    count: number;
}

type MonthData = Map<number, DayData>; // Key: Date timestamp at midnight

interface YearViewProps {
    date: Date;
    onNavigate: (date: Date) => void;
    onViewChange: (view: 'month' | 'week' | 'day') => void;
    tasks: ScheduledTask[];
}



function getPriority(status: DayStatus): number {
    switch (status) {
        case 'critical': return 4;
        case 'milestone': return 3;
        case 'completed': return 0; // Completed shouldn't override active normal?? Actually user said "All tasks on this day are completed => Green". 
        // This logic is tricky: If a day has 1 critical and 1 completed, it should be Critical (Red).
        // If a day has 1 normal and 1 completed, it should be Normal (Gold).
        // Only if ALL are completed should it be Green.
        // So 'completed' has LOWEST priority for *overriding*, but we need to track "all completed".
        // Let's solve "All Completed" via logic: If any task is NOT completed, we track the highest priority of the active ones.
        // If ALL are completed, we show Green.
        case 'normal': return 1;
    }
    return 1;
}

// Helper to determine status for a mixed bag of tasks
function resolveDayStatus(tasks: ScheduledTask[]): DayStatus {
    if (tasks.length === 0) return 'normal';

    const allCompleted = tasks.every(t => t.completed);
    if (allCompleted) return 'completed';

    // If not all completed, find the highest priority ACTIVE task
    // actually, even completed critical tasks might be important? No, user said "Red: Critical task ACTIVE".
    const activeTasks = tasks.filter(t => !t.completed);

    let maxPrio = 0;
    let finalStatus: DayStatus = 'normal';

    for (const t of activeTasks) {
        let status: DayStatus = 'normal';
        if (t.is_critical) status = 'critical';
        else if (t.is_milestone) status = 'milestone';

        const outputPrio = getPriority(status);
        if (outputPrio > maxPrio) {
            maxPrio = outputPrio;
            finalStatus = status;
        }
    }
    return finalStatus;
}

// Custom hook to partition data and preserve references
function useYearData(tasks: ScheduledTask[], year: number) {
    const prevDataRef = useRef<Record<string, MonthData>>({});

    return useMemo(() => {
        // 1. Build raw data for the year
        const rawMap: Record<string, Map<number, ScheduledTask[]>> = {};
        // We map MonthKey -> (DayTimestamp -> Task[]) first to resolve statuses correctly

        const yearStart = startOfYear(new Date(year, 0, 1));
        const yearEnd = endOfYear(new Date(year, 0, 1));

        tasks.forEach(task => {
            if (!task.start_date || !task.end_date) return;
            const start = parseISO(task.start_date);
            const end = parseISO(task.end_date);

            // Validate year overlap
            if (end < yearStart || start > yearEnd) return;

            const safeStart = start < yearStart ? yearStart : start;
            const safeEnd = end > yearEnd ? yearEnd : end;

            // Normalize to midnight
            const current = new Date(safeStart);
            current.setHours(0, 0, 0, 0);

            const endLimit = new Date(safeEnd);
            endLimit.setHours(0, 0, 0, 0);

            while (current <= endLimit) {
                const monthKey = current.getMonth().toString(); // 0-11
                if (!rawMap[monthKey]) rawMap[monthKey] = new Map();

                const dayTs = current.getTime();
                const dayList = rawMap[monthKey].get(dayTs) || [];
                dayList.push(task);
                rawMap[monthKey].set(dayTs, dayList);

                current.setDate(current.getDate() + 1);
            }
        });

        // 2. Convert to Status Map and Compare with Prev
        const finalData: Record<string, MonthData> = {};
        const prevData = prevDataRef.current;
        let hasChanges = false;

        // Iterate 0-11 months
        for (let i = 0; i < 12; i++) {
            const key = i.toString();
            const dayMap = rawMap[key];

            if (!dayMap) {
                // No tasks for this month
                if (prevData[key] && prevData[key].size > 0) {
                    finalData[key] = new Map(); // Changed to empty
                    hasChanges = true;
                } else {
                    finalData[key] = prevData[key] || new Map(); // Keep generic empty ref
                }
                continue;
            }

            // Resolve statuses
            const newMonthData: MonthData = new Map();
            let isMonthDifferent = false;
            const oldMonthData = prevData[key];

            dayMap.forEach((taskList, dayTs) => {
                const status = resolveDayStatus(taskList);
                const count = taskList.length;
                newMonthData.set(dayTs, { status, count });

                // Check diff
                if (!oldMonthData || !oldMonthData.has(dayTs)) {
                    isMonthDifferent = true;
                } else {
                    const old = oldMonthData.get(dayTs)!;
                    if (old.status !== status || old.count !== count) isMonthDifferent = true;
                }
            });

            // Also check if keys were removed
            if (oldMonthData && oldMonthData.size !== newMonthData.size) isMonthDifferent = true;

            if (isMonthDifferent) {
                finalData[key] = newMonthData;
                hasChanges = true;
            } else {
                finalData[key] = oldMonthData; // REUSE REFERENCE!
            }
        }

        if (hasChanges) {
            prevDataRef.current = finalData;
            return finalData;
        }
        return prevData; // Return exact same object if nothing changed
    }, [tasks, year]);
}

export function YearView({ date, onNavigate, onViewChange, tasks }: YearViewProps) {
    const currentYear = date.getFullYear();
    const months = useMemo(() => eachMonthOfInterval({
        start: startOfYear(date),
        end: endOfYear(date)
    }), [currentYear]); // Stable dependency only on year

    // "Smart Memoization" - only updates months that actually changed
    const yearData = useYearData(tasks, currentYear);

    return (
        <div className="flex flex-col h-full bg-surface">
            {/* Header - Restored Year Display */}
            <div className="flex items-center px-6 py-4 border-b border-border">
                <span className="text-3xl font-bold text-brand">{currentYear}</span>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="flex flex-col min-h-full gap-8 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-between">
                    {months.map(month => (
                        <MonthGrid
                            key={month.toISOString()}
                            month={month}
                            data={yearData[month.getMonth().toString()]}
                            onNavigate={onNavigate}
                            onViewChange={onViewChange}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Optimization: Memoize MonthGrid to prevent unnecessary re-renders of the entire year
const MonthGrid = memo(function MonthGrid({
    month,
    data,
    onNavigate,
    onViewChange
}: {
    month: Date;
    data: MonthData | undefined; // Now receives granular slice
    onNavigate: (date: Date) => void;
    onViewChange: (view: 'month' | 'week' | 'day') => void;
}) {
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const monthStartDate = startOfMonth(month);
    const startDate = startOfWeek(monthStartDate);
    const endDate = endOfWeek(endOfMonth(month));
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const getStatusDotColor = (status: DayStatus) => {
        switch (status) {
            case 'critical': return 'bg-danger';
            case 'milestone': return 'bg-text'; // Purple/Text color
            case 'completed': return 'bg-success';
            case 'normal': return 'bg-brand';
            default: return 'bg-text-muted';
        }
    };

    const handleDayClick = (e: React.MouseEvent) => {
        const target = (e.target as HTMLElement).closest('button');
        if (target && target.dataset.date) {
            const date = parseISO(target.dataset.date);
            onNavigate(date);
            onViewChange('day');
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <button
                onClick={() => {
                    onNavigate(month);
                    onViewChange('month');
                }}
                className="text-lg font-bold text-text-highlight mb-3 text-left hover:text-brand transition-colors w-fit"
                aria-label={`View schedule for ${format(month, 'MMMM yyyy')}`}
            >
                {format(month, 'MMMM')}
            </button>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((d, i) => (
                    <div key={i} className="text-[10px] text-text-muted text-center font-medium" aria-hidden="true">
                        {d}
                    </div>
                ))}
            </div>

            <div
                className="grid grid-cols-7 gap-y-2 gap-x-1"
                role="grid"
                onClick={handleDayClick}
            >
                {days.map(day => {
                    const isCurrentMonth = isSameMonth(day, month);

                    if (!isCurrentMonth) {
                        return <div key={day.toISOString()} className="h-6" aria-hidden="true" />;
                    }

                    const isCurrentDay = isToday(day);
                    const dayInfo = data ? data.get(day.getTime()) : undefined;
                    const hasTask = !!dayInfo;
                    const dotColor = dayInfo ? getStatusDotColor(dayInfo.status) : '';
                    const dateStr = day.toISOString();

                    return (
                        <div key={dateStr} className="flex justify-center h-8">
                            {/* Wrapper to ensure centering */}
                            <button
                                data-date={dateStr}
                                className={`
                                    relative w-7 h-7 flex flex-col items-center justify-center text-xs rounded-full cursor-pointer transition-all focus:ring-2 focus:ring-brand focus:outline-none
                                    ${isCurrentDay ? 'bg-brand text-text-inverse font-bold' : 'text-text hover:bg-surface-alt'}
                                `}
                                title={hasTask ? `${dayInfo?.count} tasks (${dayInfo?.status})` : undefined}
                            >
                                <span className={hasTask && !isCurrentDay ? 'mb-[2px]' : ''}>{format(day, 'd')}</span>
                                {hasTask && !isCurrentDay && (
                                    <div className={`w-1 h-1 rounded-full ${dotColor}`} />
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}, (prev, next) => {
    // Check strict equality of data reference (enabled by smart memoization upstream)
    return prev.month.getTime() === next.month.getTime() &&
        prev.data === next.data;
});
