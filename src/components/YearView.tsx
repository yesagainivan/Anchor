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
import { useMemo } from 'react';
import { ScheduledTask } from '../types';

interface YearViewProps {
    date: Date;
    onNavigate: (date: Date) => void;
    onViewChange: (view: 'month' | 'week' | 'day') => void;
    tasks: ScheduledTask[];
}

export function YearView({ date, onNavigate, onViewChange, tasks }: YearViewProps) {
    const currentYear = date.getFullYear();
    const yearStart = startOfYear(date);
    const yearEnd = endOfYear(date);
    // Optimization: Create a Set of "busy" date strings (YYYY-MM-DD) for O(1) lookup
    const busyDates = useMemo(() => {
        const dates = new Set<string>();
        tasks.forEach(task => {
            const start = parseISO(task.start_date);
            const end = parseISO(task.end_date);
            // If task is very long, eachDayOfInterval is heavy. But for year view we want to see coverage.
            // Let's protect against massive ranges just in case, but standard use assumes reasonable tasks.
            if (task.start_date && task.end_date) {
                // To avoid iterating thousands of days for tasks spanning years, we could optimize further.
                // For now, let's just mark start and end dates + simplified approach for ranges if needed.
                // Actually, for "busy" indicators, let's keep it simple: visual dots for start/end + "active" duration?
                // The prompt asked for "Apple aesthetic", usually dots for events.
                // Let's stick to start/end + daily coverage.
                // To be safe, clamped to the current year view to avoid generating days for 2030 tasks when viewing 2025.

                // Clamp start/end to year view
                const safeStart = start < yearStart ? yearStart : start;
                const safeEnd = end > yearEnd ? yearEnd : end;

                if (safeStart <= safeEnd) {
                    const days = eachDayOfInterval({ start: safeStart, end: safeEnd });
                    days.forEach(d => dates.add(format(d, 'yyyy-MM-dd')));
                }
            }
        });
        return dates;
    }, [tasks, yearStart, yearEnd]); // Re-calc if tasks or year changes

    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <div className="flex flex-col h-full bg-surface">
            {/* Header - Restored Year Display */}
            <div className="flex items-center px-6 py-4 border-b border-border">
                <span className="text-3xl font-bold text-brand">{currentYear}</span>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-10">
                    {months.map(month => {
                        const monthStartDate = startOfMonth(month);
                        // Always start week on Sunday for consistency
                        const startDate = startOfWeek(monthStartDate);
                        const endDate = endOfWeek(endOfMonth(month));
                        const days = eachDayOfInterval({ start: startDate, end: endDate });

                        return (
                            <div key={month.toISOString()} className="flex flex-col">
                                <button
                                    onClick={() => {
                                        onNavigate(month);
                                        onViewChange('month');
                                    }}
                                    className="text-lg font-bold text-text-highlight mb-3 text-left hover:text-brand transition-colors w-fit"
                                >
                                    {format(month, 'MMMM')}
                                </button>

                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {weekDays.map((d, i) => (
                                        <div key={i} className="text-[10px] text-text-muted text-center font-medium">
                                            {d}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                                    {days.map(day => {
                                        const isCurrentMonth = isSameMonth(day, month);
                                        const isCurrentDay = isToday(day);
                                        const dayStr = format(day, 'yyyy-MM-dd');
                                        const hasTask = isCurrentMonth && busyDates.has(dayStr);

                                        if (!isCurrentMonth) {
                                            return <div key={day.toISOString()} className="h-6" />;
                                        }

                                        return (
                                            <div
                                                key={day.toISOString()}
                                                className={`
                                                    relative h-6 flex items-center justify-center text-xs rounded-full cursor-pointer hover:bg-surface-alt transition-colors
                                                    ${isCurrentDay ? 'bg-brand text-white font-bold' : 'text-text'}
                                                `}
                                                onClick={() => {
                                                    onNavigate(day);
                                                    onViewChange('day');
                                                }}
                                            >
                                                {format(day, 'd')}
                                                {hasTask && !isCurrentDay && (
                                                    <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-text-muted/60" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
