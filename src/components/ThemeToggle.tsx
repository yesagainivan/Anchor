import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>('system');

    useEffect(() => {
        // Load saved preference
        const saved = localStorage.getItem('theme') as Theme | null;
        if (saved) {
            setTheme(saved);
        }
    }, []);

    useEffect(() => {
        const root = document.documentElement;

        if (theme === 'system') {
            localStorage.removeItem('theme');
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', isDark);
        } else {
            localStorage.setItem('theme', theme);
            root.classList.toggle('dark', theme === 'dark');
        }
    }, [theme]);

    // Listen for system theme changes when in system mode
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            document.documentElement.classList.toggle('dark', e.matches);
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [theme]);

    const cycleTheme = () => {
        const order: Theme[] = ['light', 'dark', 'system'];
        const current = order.indexOf(theme);
        const next = order[(current + 1) % order.length];
        setTheme(next);
    };

    const icon = theme === 'dark'
        ? '🌙'
        : theme === 'light'
            ? '☀️'
            : '💻';

    return (
        <button
            onClick={cycleTheme}
            className="p-2 rounded-lg hover:bg-surface-alt text-text-muted transition-colors"
            title={`Theme: ${theme}`}
        >
            <span className="text-lg">{icon}</span>
        </button>
    );
}
