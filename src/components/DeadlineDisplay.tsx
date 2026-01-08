import { differenceInDays, parseISO, format } from 'date-fns';

interface DeadlineDisplayProps {
    anchors: Record<string, string>;
}

export function DeadlineDisplay({ anchors }: DeadlineDisplayProps) {
    const anchorDates = Object.values(anchors);
    if (anchorDates.length === 0) return null;

    // Find the earliest deadline
    const dates = anchorDates.map(d => parseISO(d));
    const earliestDeadline = dates.reduce((min, d) => d < min ? d : min, dates[0]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = differenceInDays(earliestDeadline, today);

    const statusColor = daysLeft < 0
        ? 'text-red-400'
        : daysLeft <= 7
            ? 'text-amber-400'
            : 'text-emerald-400';

    return (
        <div className="bg-gray-900 text-white rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                        {anchorDates.length > 1 ? 'Earliest Deadline' : 'Deadline'}
                    </p>
                    <p className="text-xl font-semibold mt-0.5">
                        {format(earliestDeadline, 'MMM d, yyyy')}
                    </p>
                </div>

                <div className="text-right">
                    <div className={`text-3xl font-bold ${statusColor}`}>
                        {daysLeft < 0 ? 'Overdue' : daysLeft}
                    </div>
                    {daysLeft >= 0 && (
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                            {daysLeft === 1 ? 'Day left' : 'Days left'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
