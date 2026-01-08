import { differenceInDays, parseISO } from 'date-fns';

interface DeadlineDisplayProps {
    anchorDate: string;
}

export function DeadlineDisplay({ anchorDate }: DeadlineDisplayProps) {
    if (!anchorDate) return null;

    const today = new Date();
    const deadline = parseISO(anchorDate);
    const daysLeft = differenceInDays(deadline, today);

    return (
        <div className="bg-gray-900 text-white rounded-xl p-6 mb-6 shadow-lg flex flex-col md:flex-row items-center justify-between">
            <div>
                <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Project Deadline</h3>
                <div className="text-3xl font-bold mt-1">{anchorDate}</div>
            </div>

            <div className="mt-4 md:mt-0 text-center md:text-right">
                <div className="text-4xl font-black text-blue-400">
                    {daysLeft > 0 ? daysLeft : 0}
                </div>
                <div className="text-gray-400 text-sm font-medium uppercase tracking-wider">Days Remaining</div>
            </div>

            {daysLeft < 0 && (
                <div className="mt-4 md:mt-0 bg-red-600 text-white px-4 py-2 rounded-lg font-bold animate-pulse">
                    DEADLINE PASSED
                </div>
            )}
        </div>
    );
}
