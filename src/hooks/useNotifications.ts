import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from '@tauri-apps/plugin-notification';
import { useCallback, useEffect, useState } from 'react';

export const useNotifications = () => {
    const [permissionGranted, setPermissionGranted] = useState(false);

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = useCallback(async () => {
        let permission = await isPermissionGranted();
        if (!permission) {
            const request = await requestPermission();
            permission = request === 'granted';
        }
        setPermissionGranted(permission);
    }, []);

    const notify = useCallback(
        (title: string, body: string) => {
            if (!permissionGranted) {
                console.warn('Notification permission not granted');
                return;
            }

            try {
                sendNotification({
                    title,
                    body,
                });
            } catch (e) {
                console.error('Failed to send notification:', e);
            }
        },
        [permissionGranted]
    );

    return {
        permissionGranted,
        notify,
        checkPermission,
    };
};
