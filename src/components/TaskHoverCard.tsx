import { createPortal } from 'react-dom';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ScheduledTask, Task } from '../types';
import { useRef, useEffect, useState } from 'react';
import { AlertIcon } from './icons';

interface TaskHoverCardProps {
    task: ScheduledTask;
    definition?: Task;
    position: { x: number; y: number } | null;
    getTaskName: (id: string) => string;
}

export function TaskHoverCard({ task, definition, position, getTaskName }: TaskHoverCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    useEffect(() => {
        if (!position || !cardRef.current) return;

        const card = cardRef.current;
        const rect = card.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let x = position.x + 16;
        let y = position.y - 16;

        // Flip to left if it overflows right
        if (x + rect.width > viewportWidth - 20) {
            x = position.x - rect.width - 16;
        }

        // Adjust vertical if it overflows bottom
        if (y + rect.height > viewportHeight - 20) {
            y = viewportHeight - rect.height - 20;
        }

        setAdjustedPosition({ x, y });
    }, [position]);

    if (!position) return null;

    const start = parseISO(task.start_date);
    const end = parseISO(task.end_date);
    const duration = differenceInDays(end, start) || 1;

    // Portal into document.body to escape overflow:hidden of the timeline container
    // Use adjustedPosition if available, otherwise hide initially to prevent jumping
    const style: React.CSSProperties = adjustedPosition
        ? { left: adjustedPosition.x, top: adjustedPosition.y }
        : { visibility: 'hidden', left: 0, top: 0 }; // Render off-screen/hidden to measure first

    return createPortal(
        <div
            ref={cardRef}
            className="fixed z-50 pointer-events-none transition-all duration-75"
            style={style}
        >
            <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-lg shadow-xl p-3 w-72 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-2">
                {/* Header */}
                <div className="mb-2">
                    <h4 className="font-semibold text-text text-sm leading-tight mb-0.5">
                        {task.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs mt-1.5">
                        {/* Status Chip */}
                        {(() => {
                            const now = new Date();
                            now.setHours(0, 0, 0, 0); // Normalized to midnight

                            let statusLabel = 'Planned';
                            let statusClass = 'bg-surface-alt/50 text-text-muted';

                            if (task.completed) {
                                statusLabel = 'Completed';
                                statusClass = 'bg-success/15 text-success';
                            } else if (end < now) {
                                statusLabel = 'Overdue';
                                statusClass = 'bg-danger/15 text-danger';
                            } else if (start <= now && end >= now) {
                                statusLabel = 'In Progress';
                                statusClass = 'bg-brand/15 text-brand-hover';
                            }

                            return (
                                <span className={`px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
                                    {statusLabel}
                                </span>
                            );
                        })()}

                        {/* Critical Path Badge */}
                        {task.is_critical && !task.completed && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-medium border border-orange-200/50">
                                <AlertIcon className="w-3 h-3" />
                                Critical Path
                            </span>
                        )}

                        <span className="text-text-muted ml-auto">
                            {duration} day{duration !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Dates */}
                <div className="bg-surface-alt/50 rounded p-2 mb-2 text-xs">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-text-faint">Start</span>
                        <span className="text-text font-medium">{format(start, 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-text-faint">End</span>
                        <span className="text-text font-medium">{format(end, 'MMM d, yyyy')}</span>
                    </div>
                </div>

                {/* Notes */}
                {task.notes && (
                    <div className="bg-surface-alt/30 rounded p-2 mb-2 text-xs border border-border-muted/50">
                        <span className="text-text-faint font-medium block mb-0.5">Notes</span>
                        <div className="text-text-muted whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                            {task.notes}
                        </div>
                    </div>
                )}

                {/* Dependencies info */}
                {definition && definition.dependencies.length > 0 && (
                    <div className="text-xs border-t border-border pt-2 mt-2">
                        <span className="text-text-faint block mb-1.5 font-medium">Waiting on</span>
                        <div className="flex flex-col gap-1">
                            {definition.dependencies.map(depId => (
                                <div key={depId} className="flex items-center gap-1.5 text-text-muted">
                                    <div className="w-1 h-1 rounded-full bg-border" />
                                    <span className="truncate">{getTaskName(depId)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
