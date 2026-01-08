import { ScheduledTask } from '../types';

interface TimelineProps {
    tasks: ScheduledTask[];
}

export function Timeline({ tasks }: TimelineProps) {
    // Sort tasks by start date
    const sortedTasks = [...tasks].sort((a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    return (
        <div className="p-4 bg-white rounded-lg shadow mt-4 md:mt-0 text-left">
            <h2 className="text-xl font-bold mb-4">Retro Timeline</h2>
            {tasks.length === 0 ? (
                <p className="text-gray-500">No scheduled tasks to display.</p>
            ) : (
                <div className="relative border-l-2 border-blue-500 ml-3 space-y-6">
                    {sortedTasks.map((task) => (
                        <div key={task.id} className="mb-8 ml-6 relative">
                            <div className="absolute -left-[31px] bg-blue-500 h-4 w-4 rounded-full border-2 border-white"></div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-lg text-blue-900">{task.name}</h3>
                                <div className="text-sm text-gray-600 mt-1 flex flex-col sm:flex-row sm:gap-4">
                                    <span>Start: <span className="font-medium text-black">{task.start_date}</span></span>
                                    <span>End: <span className="font-medium text-black">{task.end_date}</span></span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
