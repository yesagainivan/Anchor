import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import withDragAndDrop, { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, endOfWeek, addYears, subYears } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ScheduledTask } from '../types';
import { useState } from 'react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './CalendarView.css';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { YearView } from './YearView';

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
    onTaskMove?: (taskId: string, newDate: string) => void;
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

export function CalendarView({ tasks, onTaskMove }: CalendarViewProps) {
    const [view, setView] = useState<CalendarViewType>('month');
    const [date, setDate] = useState(new Date());

    const events = tasks.map(task => ({
        id: task.id,
        title: task.name,
        start: parse(task.start_date, 'yyyy-MM-dd', new Date()),
        end: parse(task.end_date, 'yyyy-MM-dd', new Date()),
        allDay: true,
        resource: task
    }));

    const onEventDrop: withDragAndDropProps<CalendarEvent>['onEventDrop'] = (data) => {
        if (!onTaskMove) return;
        const dateStr = format(data.start, 'yyyy-MM-dd');
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

    const eventPropGetter = () => {
        return {
            className: 'cursor-move bg-brand border-brand text-white shadow-sm',
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
                        resizable={false}
                        eventPropGetter={eventPropGetter}
                        draggableAccessor={() => true}
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
