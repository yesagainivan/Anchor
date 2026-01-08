import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ScheduledTask } from '../types';
import './CalendarView.css'; // We'll create this for specific overrides

interface CalendarViewProps {
    tasks: ScheduledTask[];
}

export function CalendarView({ tasks }: CalendarViewProps) {
    const events = tasks.map(task => ({
        id: task.id,
        title: task.name,
        start: task.start_date,
        end: task.end_date, // Note: FullCalendar end date is exclusive, might need adjustment depending on how backend sends it
        allDay: true // Assuming tasks are day-based for now given the "retro" nature
    }));

    return (
        <div className="calendar-container bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-[600px]">
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={events}
                editable={true}
                droppable={true}
                height="100%"
                eventColor="#3b82f6" // blue-500
                eventBorderColor="#2563eb" // blue-600
                dayMaxEvents={true}
            />
        </div>
    );
}
