import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ScheduledTask } from '../types';
import './CalendarView.css'; // We'll create this for specific overrides

interface CalendarViewProps {
    tasks: ScheduledTask[];
    onTaskMove?: (taskId: string, newDate: string) => void;
}

export function CalendarView({ tasks, onTaskMove }: CalendarViewProps) {
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
                eventDrop={(info) => {
                    if (onTaskMove && info.event.end) {
                        // FullCalendar end is exclusive, which matches our "Deadline" concept (Start = End - Duration)
                        // We need to format it as YYYY-MM-DD
                        const date = info.event.end;
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        onTaskMove(info.event.id, dateStr);
                    }
                }}
                height="100%"
                eventColor="#3b82f6" // blue-500
                eventBorderColor="#2563eb" // blue-600
                dayMaxEvents={true}
            />
        </div>
    );
}
