import { useEffect, useState } from 'react';
import { SunIcon, MoonIcon, ComputerIcon } from './icons';

type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme') as Theme | null;
            return saved || 'system';
        }
        return 'system';
    });

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

    const Icon = theme === 'dark'
        ? MoonIcon
        : theme === 'light'
            ? SunIcon
            : ComputerIcon;

    return (
        <button
            onClick={cycleTheme}
            className="p-2 rounded-lg hover:bg-surface-alt text-text-muted transition-colors"
            title={`Theme: ${theme}`}
        >
            <Icon className="w-5 h-5" />
        </button>
    );
}
