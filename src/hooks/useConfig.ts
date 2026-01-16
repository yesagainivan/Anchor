import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export type MyAppTheme = 'light' | 'dark' | 'system';

export interface AppConfig {
    theme: MyAppTheme;
}

export function useConfig() {
    const [config, setConfig] = useState<AppConfig>({ theme: 'system' });
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const loadedConfig = await invoke<AppConfig>('load_config');
                setConfig(loadedConfig);
            } catch (e) {
                console.error("Failed to load config:", e);
            } finally {
                setLoaded(true);
            }
        };
        load();

        const unlistenPromise = listen<AppConfig>('config-changed', (event) => {
            setConfig(event.payload);
        });

        return () => {
            unlistenPromise.then(unlisten => unlisten());
        };
    }, []);

    const updateTheme = async (theme: MyAppTheme) => {
        const newConfig = { ...config, theme };
        setConfig(newConfig);
        try {
            await invoke('save_config', { config: newConfig });
        } catch (e) {
            console.error("Failed to save config:", e);
        }
    };

    return {
        theme: config.theme,
        setTheme: updateTheme,
        loaded
    };
}
