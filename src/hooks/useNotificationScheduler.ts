import { useEffect } from 'react';
import { ScheduledTask } from '../types';
import { useNotifications } from './useNotifications';
import { format } from 'date-fns';

export const useNotificationScheduler = (
    scheduledTasks: ScheduledTask[] | undefined
) => {
    const { notify, permissionGranted } = useNotifications();

    useEffect(() => {
        if (!scheduledTasks || !permissionGranted) return;

        const checkAndNotify = () => {
            const today = format(new Date(), 'yyyy-MM-dd');

            scheduledTasks.forEach((task) => {
                // Skip completed tasks
                if (task.completed) return;

                const notificationKey = `anchor_notified_${task.id}_${today}`;
                const hasNotified = localStorage.getItem(notificationKey);

                if (hasNotified) return;

                // Logic 1: Task starts today
                if (task.start_date === today) {
                    notify(
                        '⚓ Time to Start!',
                        `"${task.name}" is scheduled to start today to stay on track.`
                    );
                    localStorage.setItem(notificationKey, 'true');
                }

                // Logic 2: Critical Path Warning (If slack is zero and it hasn't finished)
                // We only notify if it's currently active (start date <= today <= end date)
                else if (
                    task.is_critical &&
                    task.start_date <= today &&
                    task.end_date >= today
                ) {
                    // Different key for critical reminder to allow distinct notifications?
                    // For now, let's treat "daily critical reminder" as the same "once per day" slot.
                    notify(
                        '🔥 Critical Task',
                        `"${task.name}" is critical and active. Any delay will push the deadline!`
                    );
                    localStorage.setItem(notificationKey, 'true');
                }
            });
        };

        // Run immediately on load/change
        checkAndNotify();

        // Optional: Setup an interval to check every hour? 
        // For now, checking on data change/mount is sufficient for a local app.

    }, [scheduledTasks, permissionGranted, notify]);
};
