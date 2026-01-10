import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

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
