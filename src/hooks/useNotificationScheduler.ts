import { useEffect } from 'react';
import { ScheduledTask } from '../types';
import { useNotifications } from './useNotifications';
import { format, parseISO, isSameDay, isPast, isFuture } from 'date-fns';

export const useNotificationScheduler = (
    scheduledTasks: ScheduledTask[] | undefined
) => {
    const { notify, permissionGranted } = useNotifications();

    useEffect(() => {
        // Cleanup old notification keys on mount
        const today = format(new Date(), 'yyyy-MM-dd');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('anchor_notified_') && !key.endsWith(today)) {
                localStorage.removeItem(key);
            }
        }
    }, []);

    useEffect(() => {
        if (!scheduledTasks || !permissionGranted) return;

        const checkAndNotify = () => {
            const now = new Date();
            const todayStr = format(now, 'yyyy-MM-dd');

            scheduledTasks.forEach((task) => {
                // Skip completed tasks
                if (task.completed) return;

                const notificationKey = `anchor_notified_${task.id}_${todayStr}`;
                const hasNotified = localStorage.getItem(notificationKey);

                if (hasNotified) return;

                const start = parseISO(task.start_date);
                const end = parseISO(task.end_date);

                // Logic 1: Task starts "soon" or "now" (within last 15 mins or next 5 mins?)
                // Actually, if it's Minute granularity, we want to notify exactly when it starts.
                // Or if it started recently and we haven't notified.
                // Simple logic: If start time is in the past (active) and we haven't notified today.
                // Constraint: Don't notify for tasks strictly in the past (started yesterday).
                // So: isSameDay(start, now) && isPast(start)

                if (isSameDay(start, now) && isPast(start)) {
                    notify(
                        '⚓ Time to Start!',
                        `"${task.name}" is scheduled to start now.`
                    );
                    localStorage.setItem(notificationKey, 'true');
                }

                // Logic 2: Critical Path Warning
                else if (
                    task.is_critical &&
                    isPast(start) &&
                    isFuture(end)
                ) {
                    // Only notify if we haven't already
                    // This duplicates the above if start is today.
                    // Prioritize "Time to Start".

                    // We might want a separate key or check for critical warning? 
                    // reusing same key means only 1 notification per task per day.
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

        // Check periodically (every minute)
        const intervalId = setInterval(checkAndNotify, 60 * 1000);

        return () => clearInterval(intervalId);

    }, [scheduledTasks, permissionGranted, notify]);
};

