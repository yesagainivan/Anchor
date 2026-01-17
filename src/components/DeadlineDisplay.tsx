import { differenceInDays, parseISO, format } from 'date-fns';
import { getProjectStatus, getStatusColor } from '../utils/status';

interface DeadlineDisplayProps {
    anchors: Record<string, string>;
}

export function DeadlineDisplay({ anchors }: DeadlineDisplayProps) {
    const anchorDates = Object.values(anchors).filter(Boolean);
    if (anchorDates.length === 0) return null;

    const dates = anchorDates.map(d => parseISO(d));
    const earliestDeadline = dates.reduce((min, d) => d < min ? d : min, dates[0]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = differenceInDays(earliestDeadline, today);

    const status = getProjectStatus(daysLeft);
    const colorClass = getStatusColor(status);

    return (
        <div className="bg-surface-raised/50 rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-text-faint text-xs font-medium uppercase tracking-wider">
                        {anchorDates.length > 1 ? 'Earliest Deadline' : 'Deadline'}
                    </p>
                    <p className="text-lg font-semibold text-text mt-0.5">
                        {format(earliestDeadline, 'MMM d, yyyy')}
                    </p>
                </div>

                <div className="text-right">
                    <div className={`text-2xl font-bold ${colorClass}`}>
                        {daysLeft < 0 ? 'Overdue' : daysLeft}
                    </div>
                    {daysLeft >= 0 && (
                        <p className="text-text-faint text-xs font-medium uppercase tracking-wider">
                            {daysLeft === 1 ? 'Day left' : 'Days left'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
