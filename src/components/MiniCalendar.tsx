import { useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    addMonths,
    subMonths,
    isToday,
    isSameDay,
    parseISO
} from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';


interface MiniCalendarProps {
    tasks: {
        id: string;
        start_date: string;
        end_date: string;
        status: 'active' | 'future' | 'overdue';
        completed: boolean;
        is_milestone?: boolean;
    }[];
}

export function MiniCalendar({ tasks }: MiniCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const jumpToToday = () => setCurrentDate(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    // Find the very last task date (Final Goal) from the available tasks
    const derivedDeadline = tasks.length > 0
        ? tasks.reduce((max, t) => t.end_date > max ? t.end_date : max, tasks[0].end_date)
        : null;

    const getDayStatus = (day: Date) => {
        // Simple check if any task falls on this day
        // This could be optimized if task list is huge, but for widget tasks it's likely fine
        const dayTasks = tasks.filter(task => {
            // Check if day is between start and end (inclusive) Naive check
            const start = parseISO(task.start_date);
            const end = parseISO(task.end_date);
            return (day >= start && day <= end) || isSameDay(day, start) || isSameDay(day, end);
        });

        // Priority: Completed > Overdue > Deadline > Milestone > Active > Future
        if (dayTasks.some(t => t.completed)) return 'completed';
        if (dayTasks.some(t => t.status === 'overdue')) return 'overdue';

        // explicit project deadline (Final Goal) - Brand Color
        if (derivedDeadline && isSameDay(day, parseISO(derivedDeadline))) return 'deadline';

        // Milestone end date - Purple
        if (dayTasks.some(t => t.is_milestone && isSameDay(day, parseISO(t.end_date)))) return 'milestone';

        if (dayTasks.some(t => t.status === 'active')) return 'active';
        if (dayTasks.length > 0) return 'future';

        return null;
    };

    return (
        <div className="flex flex-col h-full w-full p-2">
            <div className="flex items-center justify-between mb-2 px-1">
                <button onClick={prevMonth} className="p-1 hover:bg-surface-alt rounded text-text-muted hover:text-text">
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <div
                    onClick={jumpToToday}
                    className="text-xs font-semibold text-text cursor-pointer hover:text-brand transition-colors select-none"
                    title="Jump to Today"
                >
                    {format(currentDate, 'MMMM yyyy')}
                </div>
                <button onClick={nextMonth} className="p-1 hover:bg-surface-alt rounded text-text-muted hover:text-text">
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
                {weekDays.map((day, i) => (
                    <div key={i} className="text-[10px] text-center text-text-muted font-medium py-1">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 grid-rows-6 gap-y-1 flex-1">
                {calendarDays.map((day) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isCurrentDay = isToday(day);
                    const status = getDayStatus(day);

                    return (
                        <div
                            key={day.toISOString()}
                            className={`
                                relative flex items-center justify-center text-[10px] h-6 w-full rounded-md
                                ${!isCurrentMonth ? 'text-text-faint/50' : 'text-text'}
                                ${isCurrentDay ? 'bg-brand text-white font-bold shadow-sm' : ''}
                            `}
                        >
                            {format(day, 'd')}

                            {/* Dot indicator for events */}
                            {status && !isCurrentDay && (
                                <div className={`
                                    absolute bottom-0.5 w-1 h-1 rounded-full
                                    ${status === 'completed' ? 'bg-success' :
                                        status === 'overdue' ? 'bg-danger' :
                                            status === 'deadline' ? 'bg-brand' :
                                                status === 'milestone' ? 'bg-purple-500' :
                                                    status === 'active' ? 'bg-brand/50' : 'bg-text-muted'}
                                `} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
