interface CircularProgressProps {
    progress: number; // 0 to 1
    status: 'on_track' | 'urgent' | 'overdue' | string;
    size?: number;
    strokeWidth?: number;
    children?: React.ReactNode;
}

export function CircularProgress({
    progress,
    status,
    size = 140,
    strokeWidth = 6,
    children
}: CircularProgressProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress * circumference);

    // Gradient colors based on status
    const getGradientColors = () => {
        switch (status) {
            case 'overdue':
                return { start: '#ef4444', end: '#dc2626' }; // red
            case 'urgent':
                return { start: '#ea580c', end: '#f59e0b' }; // orange to amber
            case 'on_track':
                return { start: 'var(--color-success)', end: 'var(--color-success)' };
            default:
                return { start: 'var(--color-brand)', end: 'var(--color-brand-hover)' };
        }
    };

    const colors = getGradientColors();
    const gradientId = `progress-gradient-${status}`;
    const isUrgent = status === 'urgent' || status === 'overdue';

    return (
        <div className="relative inline-flex items-center justify-center overflow-visible p-2">
            <svg
                width={size}
                height={size}
                className={`transform -rotate-90 overflow-visible ${isUrgent ? 'animate-pulse-subtle' : ''}`}
            >
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.start} />
                        <stop offset="100%" stopColor={colors.end} />
                    </linearGradient>
                    {/* Glow filter for urgent states */}
                    {isUrgent && (
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    )}
                </defs>

                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-border-muted opacity-30"
                />

                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={`url(#${gradientId})`}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{
                        transition: 'stroke-dashoffset 1s ease-in-out',
                    }}
                    filter={isUrgent ? 'url(#glow)' : undefined}
                />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {children}
            </div>
        </div>
    );
}
