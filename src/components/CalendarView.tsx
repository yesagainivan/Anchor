import { Calendar, dateFnsLocalizer, View, ToolbarProps } from 'react-big-calendar';
import withDragAndDrop, { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ScheduledTask } from '../types';
import { useState } from 'react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './CalendarView.css';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

const CustomToolbar = (toolbar: ToolbarProps<CalendarEvent>) => {
    const goToBack = () => {
        toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
        toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
        toolbar.onNavigate('TODAY');
    };

    const label = () => {
        return <span className="text-lg font-semibold text-text">{toolbar.label}</span>;
    };

    return (
        <div className="flex items-center justify-between mb-4 p-2">
            <div className="flex items-center gap-2">
                <button type="button" onClick={goToBack} className="p-1.5 rounded-lg hover:bg-border-muted text-text-muted hover:text-text transition-colors border border-transparent hover:border-border-muted" aria-label="Previous">
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <button type="button" onClick={goToNext} className="p-1.5 rounded-lg hover:bg-border-muted text-text-muted hover:text-text transition-colors border border-transparent hover:border-border-muted" aria-label="Next">
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
                <button type="button" onClick={goToCurrent} className="ml-2 px-3 py-1.5 text-sm font-medium bg-surface text-text border border-border hover:bg-surface-alt hover:border-border-muted transition-colors rounded-md shadow-sm">
                    Today
                </button>
            </div>

            <div className="rbc-toolbar-label">{label()}</div>

            <div className="flex bg-surface-alt rounded-lg p-1 gap-1">
                {['month', 'week', 'day'].map(view => (
                    <button
                        key={view}
                        type="button"
                        onClick={() => toolbar.onView(view as View)}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${toolbar.view === view
                            ? 'bg-surface text-text shadow-sm'
                            : 'text-text-muted hover:text-text'
                            }`}
                    >
                        {view.charAt(0).toUpperCase() + view.slice(1)}
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
    const [view, setView] = useState<View>('month');
    const [date, setDate] = useState(new Date());

    const events = tasks.map(task => ({
        id: task.id,
        title: task.name,
        // Parse "YYYY-MM-DD" as local midnight to avoid UTC offsets shifting the day
        start: parse(task.start_date, 'yyyy-MM-dd', new Date()),
        end: parse(task.end_date, 'yyyy-MM-dd', new Date()),
        allDay: true,
        resource: task
    }));

    const onEventDrop: withDragAndDropProps<CalendarEvent>['onEventDrop'] = (data) => {
        if (!onTaskMove) return;
        // In react-big-calendar, end date is exclusive for all-day events.
        // We update the task's start date to the dropped date.
        // Using date-fns format to ensure correct local date string "YYYY-MM-DD"
        // disregarding any potential timezone confusion
        const dateStr = format(data.start, 'yyyy-MM-dd');
        // Casting event to any because the generic typing on DnD props can be tricky with custom event objects
        onTaskMove((data.event as any).id, dateStr);
    };

    const onShowMore = (_events: any[], date: Date) => {
        setDate(date);
        setView('day');
    };

    const eventPropGetter = () => {
        return {
            className: 'cursor-move bg-brand border-brand text-white shadow-sm',
        };
    };

    return (
        <div className="rbc-calendar-container bg-surface rounded-xl shadow-sm border border-border p-4 h-[700px]">
            <DnDCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                views={['month', 'week', 'day']}
                popup
                className="font-sans text-text"
                components={{
                    toolbar: CustomToolbar
                }}
                onEventDrop={onEventDrop}
                resizable={false}
                eventPropGetter={eventPropGetter}
                draggableAccessor={() => true}
                onShowMore={onShowMore}
            />
        </div>
    );
}
