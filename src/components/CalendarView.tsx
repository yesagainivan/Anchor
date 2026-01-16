import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import withDragAndDrop, { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, endOfWeek, addYears, subYears, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ScheduledTask } from '../types';
import { useState } from 'react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './CalendarView.css';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { YearView } from './YearView';
import { Task } from '../types'; // Import Task definition

type CalendarViewType = View | 'year';

interface CalendarHeaderProps {
    date: Date;
    view: CalendarViewType;
    onViewChange: (view: CalendarViewType) => void;
    onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
}

const CalendarHeader = ({ date, view, onViewChange, onNavigate }: CalendarHeaderProps) => {
    const getLabel = () => {
        if (view === 'year') return format(date, 'yyyy');
        if (view === 'month') return format(date, 'MMMM yyyy');
        if (view === 'day') return format(date, 'EEEE, MMMM do, yyyy');
        if (view === 'week') {
            const start = startOfWeek(date);
            const end = endOfWeek(date);
            if (start.getMonth() === end.getMonth()) {
                return `${format(start, 'MMMM d')} – ${format(end, 'd')}`;
            }
            return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
        }
        return '';
    };

    return (
        <div className="flex items-center justify-between mb-4 p-2">
            <div className="flex items-center gap-2">
                <button onClick={() => onNavigate('PREV')} className="p-1.5 rounded-lg hover:bg-border-muted text-text-muted hover:text-text transition-colors border border-transparent hover:border-border-muted" aria-label="Previous">
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <button onClick={() => onNavigate('NEXT')} className="p-1.5 rounded-lg hover:bg-border-muted text-text-muted hover:text-text transition-colors border border-transparent hover:border-border-muted" aria-label="Next">
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
                <button onClick={() => onNavigate('TODAY')} className="ml-2 px-3 py-1.5 text-sm font-medium bg-surface text-text border border-border hover:bg-surface-alt hover:border-border-muted transition-colors rounded-md shadow-sm">
                    Today
                </button>
            </div>

            <div className="text-lg font-semibold text-text">{getLabel()}</div>

            <div className="flex bg-surface-alt rounded-lg p-1 gap-1">
                {(['year', 'month', 'week', 'day'] as CalendarViewType[]).map(v => (
                    <button
                        key={v}
                        type="button"
                        onClick={() => onViewChange(v)}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${view === v
                            ? 'bg-surface text-text shadow-sm'
                            : 'text-text-muted hover:text-text'
                            }`}
                    >
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
};

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource: ScheduledTask;
}

interface CalendarViewProps {
    tasks: ScheduledTask[];
    definitions: Task[];
    onTaskMove?: (taskId: string, newDate: string) => void;
    onTaskDurationChange?: (taskId: string, newDurationMinutes: number) => void;
}

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

export function CalendarView({ tasks, definitions, onTaskMove, onTaskDurationChange }: CalendarViewProps) {
    const [view, setView] = useState<CalendarViewType>('month');
    const [date, setDate] = useState(new Date());

    const events = tasks.map(task => {
        const def = definitions.find(d => d.id === task.id);
        const start = parseISO(task.start_date);
        const end = parseISO(task.end_date);

        // Determine if it should be an all-day event
        // If it was defined with days (not minutes) or is >= 24 hours
        const isAllDay = def ? (def.duration_minutes === undefined || def.duration_minutes === null) : true;

        return {
            id: task.id,
            title: task.name,
            start,
            end,
            allDay: isAllDay,
            resource: task
        };
    });

    const onEventResize: withDragAndDropProps<CalendarEvent>['onEventResize'] = (data) => {
        if (!onTaskDurationChange) return;

        const start = data.start as Date;
        const end = data.end as Date;

        // Calculate minutes difference
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));

        if (diffMinutes > 0) {
            onTaskDurationChange((data.event as any).id, diffMinutes);
        }
    };

    const onEventDrop: withDragAndDropProps<CalendarEvent>['onEventDrop'] = (data) => {
        if (!onTaskMove) return;

        let dateStr: string;

        if (data.isAllDay) {
            dateStr = format(new Date(data.start), 'yyyy-MM-dd');
        } else {
            // Preserve time if it's not an all-day event
            dateStr = new Date(data.start).toISOString();
        }

        onTaskMove((data.event as any).id, dateStr);
    };

    const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
        if (action === 'TODAY') {
            setDate(new Date());
            return;
        }

        switch (view) {
            case 'year':
                setDate(prev => action === 'NEXT' ? addYears(prev, 1) : subYears(prev, 1));
                break;
            case 'month':
                setDate(prev => action === 'NEXT' ? addMonths(prev, 1) : subMonths(prev, 1));
                break;
            case 'week':
                setDate(prev => action === 'NEXT' ? addWeeks(prev, 1) : subWeeks(prev, 1));
                break;
            case 'day':
                setDate(prev => action === 'NEXT' ? addDays(prev, 1) : subDays(prev, 1));
                break;
        }
    };

    const slotPropGetter = (date: Date) => {
        const hour = date.getHours();
        const isBusinessHour = hour >= 9 && hour < 18; // 9 AM to 6 PM
        return {
            className: isBusinessHour ? 'bg-surface-alt/30' : 'bg-surface/50',
            style: isBusinessHour ? {} : { opacity: 0.8 } // Subtle dimming for off-hours
        };
    };

    const eventPropGetter = (event: CalendarEvent) => {
        const task = event.resource;
        const classes = ['cursor-move text-white shadow-sm !transition-all !duration-200 !ease-in-out hover:!-translate-y-px hover:!shadow-md hover:z-50 relative'];

        if (task.completed) {
            classes.push('bg-success border-success opacity-80 decoration-slice line-through');
        } else if (task.is_milestone) {
            classes.push('bg-text text-surface border-text font-bold rotate-1 hover:rotate-0 hover:scale-105 z-10');
        } else {
            classes.push('bg-brand border-brand');
        }

        // this is ugly, will fix later with a better solution TODO
        // if (task.is_critical && !task.completed) {
        //     classes.push('ring-2 ring-danger ring-offset-1 ring-offset-surface');
        // }

        return {
            className: classes.join(' '),
        };
    };

    return (
        <div className="rbc-calendar-container bg-surface rounded-xl shadow-sm border border-border p-4 h-full flex flex-col overflow-hidden">
            <CalendarHeader
                date={date}
                view={view}
                onViewChange={setView}
                onNavigate={handleNavigate}
            />

            <div className="flex-1 overflow-hidden relative">
                {view === 'year' ? (
                    <YearView
                        date={date}
                        onNavigate={setDate}
                        onViewChange={(v) => setView(v)}
                        tasks={tasks}
                    />
                ) : (
                    <DnDCalendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        view={view as View}
                        onView={(v) => setView(v)}
                        date={date}
                        onNavigate={setDate}
                        toolbar={false}
                        popup
                        className="font-sans text-text"
                        onEventDrop={onEventDrop}
                        onEventResize={onEventResize}
                        resizable={true}
                        scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
                        eventPropGetter={eventPropGetter}
                        slotPropGetter={slotPropGetter}
                        draggableAccessor={() => true}
                        step={15}
                        timeslots={4}
                        formats={{
                            timeGutterFormat: (date: Date, culture?: string, localizer?: any) =>
                                localizer.format(date, 'h aa', culture),
                            dayFormat: (date: Date, culture?: string, localizer?: any) =>
                                localizer.format(date, 'EEE d', culture),
                        }}
                    />
                )}
            </div>
        </div>
    );
}
