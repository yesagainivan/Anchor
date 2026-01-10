import { SunIcon, MoonIcon, ComputerIcon } from './icons';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
}

export function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
    const cycleTheme = () => {
        const order: Theme[] = ['light', 'dark', 'system'];
        const current = order.indexOf(theme);
        const next = order[(current + 1) % order.length];
        onThemeChange(next);
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

