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
import { useMemo, memo } from 'react';
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
    // Optimization: Create a Set of "busy" timestamps (at midnight) for O(1) lookup
    const busyDates = useMemo(() => {
        const timestamps = new Set<number>();

        tasks.forEach(task => {
            if (!task.start_date || !task.end_date) return;

            const start = parseISO(task.start_date);
            const end = parseISO(task.end_date);

            // Normalize to start of day to avoid time issues
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            // Clamp start/end to year view to avoid huge loops for tasks spanning decades
            const safeStart = start < yearStart ? yearStart : start;
            const safeEnd = end > yearEnd ? yearEnd : end;

            if (safeStart <= safeEnd) {
                // Simple loop is much faster than eachDayOfInterval + formatting
                const current = new Date(safeStart);
                while (current <= safeEnd) {
                    timestamps.add(current.getTime());
                    current.setDate(current.getDate() + 1);
                }
            }
        });
        return timestamps;
    }, [tasks, yearStart, yearEnd]); // Re-calc if tasks or year changes

    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    return (
        <div className="flex flex-col h-full bg-surface">
            {/* Header - Restored Year Display */}
            <div className="flex items-center px-6 py-4 border-b border-border">
                <span className="text-3xl font-bold text-brand">{currentYear}</span>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-10">
                    {months.map(month => (
                        <MonthGrid
                            key={month.toISOString()}
                            month={month}
                            busyDates={busyDates}
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
    busyDates,
    onNavigate,
    onViewChange
}: {
    month: Date;
    busyDates: Set<number>;
    onNavigate: (date: Date) => void;
    onViewChange: (view: 'month' | 'week' | 'day') => void;
}) {
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const monthStartDate = startOfMonth(month);
    // Always start week on Sunday for consistency
    const startDate = startOfWeek(monthStartDate);
    const endDate = endOfWeek(endOfMonth(month));
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
        <div className="flex flex-col">
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

            <div className="grid grid-cols-7 gap-y-2 gap-x-1" role="grid">
                {days.map(day => {
                    const isCurrentMonth = isSameMonth(day, month);
                    const isCurrentDay = isToday(day);
                    // Optimize: utilize timestamp check directly
                    const hasTask = isCurrentMonth && busyDates.has(day.getTime());

                    if (!isCurrentMonth) {
                        return <div key={day.toISOString()} className="h-6" aria-hidden="true" />;
                    }

                    return (
                        <button
                            key={day.toISOString()}
                            className={`
                                relative h-6 w-full flex items-center justify-center text-xs rounded-full cursor-pointer hover:bg-surface-alt transition-colors focus:ring-2 focus:ring-brand focus:outline-none
                                ${isCurrentDay ? 'bg-brand text-white font-bold' : 'text-text'}
                            `}
                            onClick={() => {
                                onNavigate(day);
                                onViewChange('day');
                            }}
                            aria-label={`${format(day, 'MMMM do')}${hasTask ? ', has tasks' : ''}${isCurrentDay ? ', Today' : ''}`}
                        >
                            {format(day, 'd')}
                            {hasTask && !isCurrentDay && (
                                <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-text-muted/60" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}, (prev: { month: Date; busyDates: Set<number> }, next: { month: Date; busyDates: Set<number> }) => {
    // Custom comparison for performance: rarely need to re-render unless month changes or busy dates *for this month* change
    // For simplicity and safety, we default to shallow comparison (which React.memo does by default).
    // The `busyDates` set ref change will trigger re-render of all, which is correct behaviors when tasks change.
    return prev.month.getTime() === next.month.getTime() &&
        prev.busyDates === next.busyDates;
});
