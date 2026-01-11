import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, ScheduledTask } from '../types';
import { MemoIcon, CalendarIcon, CheckIcon, CloseIcon, EditIcon } from './icons';
import { format, parseISO } from 'date-fns';

interface TaskDetailsViewProps {
    taskId: string | null;
    tasks: Task[];
    schedule: ScheduledTask[];
    onUpdateTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onClose: () => void;
}

export function TaskDetailsView({
    taskId,
    tasks,
    schedule,
    onUpdateTask,
    onDeleteTask,
    onClose
}: TaskDetailsViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editNotes, setEditNotes] = useState('');

    // Find the task data
    const taskDef = tasks.find(t => t.id === taskId);
    const taskSched = schedule.find(t => t.id === taskId);

    useEffect(() => {
        if (taskDef) {
            setEditName(taskDef.name);
            setEditNotes(taskDef.notes || '');
        }
    }, [taskDef, isEditing]); // Reset when entering edit mode or task changes

    if (!taskId || !taskDef) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
                <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mb-4">
                    <MemoIcon className="w-8 h-8 opacity-50" />
                </div>
                <p>Select a task to view details</p>
            </div>
        );
    }

    const handleSave = () => {
        onUpdateTask({
            ...taskDef,
            name: editName,
            notes: editNotes.trim() || undefined
        });
        setIsEditing(false);
    };

    const toggleCompletion = () => {
        onUpdateTask({
            ...taskDef,
            completed: !taskDef.completed
        });
    };

    return (
        <div className="h-full flex flex-col bg-surface overflow-hidden rounded-xl border border-border shadow-sm">
            {/* Header */}
            <div className="p-6 border-b border-border bg-surface flex items-start justify-between gap-4">
                <div className="flex-1 flex items-start gap-3">
                    <button
                        onClick={onClose}
                        className="mt-1 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
                        title="Back to List"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        {isEditing ? (
                            <input
                                className="text-2xl font-bold bg-surface-alt border border-border rounded px-2 py-1 w-full text-text focus:ring-2 focus:ring-brand outline-none"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                placeholder="Task Name"
                                autoFocus
                            />
                        ) : (
                            <h2 className={`text-2xl font-bold text-text flex items-center gap-3 ${taskDef.completed ? 'line-through opacity-60' : ''}`}>
                                {taskDef.name}
                                {taskDef.completed && <span className="text-base font-normal no-underline px-2 py-0.5 bg-success/10 text-success rounded-full text-xs">Completed</span>}
                            </h2>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
                            <div className="flex items-center gap-1.5">
                                <span className="font-medium bg-surface-alt px-2 py-0.5 rounded text-xs">{taskDef.duration_days} days</span>
                            </div>
                            {taskSched && (
                                <div className="flex items-center gap-1.5 text-text-faint">
                                    <CalendarIcon className="w-4 h-4" />
                                    <span>
                                        {format(parseISO(taskSched.start_date), 'MMM d')} - {format(parseISO(taskSched.end_date), 'MMM d')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isEditing && (
                            <>
                                <button
                                    onClick={toggleCompletion}
                                    className={`p-2 rounded transition-colors ${taskDef.completed
                                        ? 'bg-success/10 text-success hover:bg-success/20'
                                        : 'bg-surface-alt text-text-muted hover:text-text hover:bg-border'}`}
                                    title={taskDef.completed ? "Mark Incomplete" : "Mark Complete"}
                                >
                                    <CheckIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 bg-surface-alt text-text-muted hover:text-text hover:bg-border rounded transition-colors"
                                    title="Edit"
                                >
                                    <EditIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => onDeleteTask(taskId)}
                                    className="p-2 bg-surface-alt text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                                    title="Delete"
                                >
                                    <CloseIcon className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        {isEditing && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text hover:bg-surface-alt rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 text-sm font-medium bg-brand text-white hover:bg-brand-hover rounded transition-colors shadow-sm"
                                >
                                    Save Changes
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Note Editor / Preview */}
            <div className={`p-6 flex-1 overflow-auto ${isEditing ? 'bg-surface-alt/20' : ''}`}>
                <div className="max-w-3xl mx-auto h-full flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                            <MemoIcon className="w-4 h-4" />
                            Notes
                        </h3>
                    </div>

                    <div className="flex-1 min-h-[200px] h-full">
                        {isEditing ? (
                            <textarea
                                className="w-full h-full bg-surface border border-border rounded-lg p-4 text-base text-text placeholder:text-text-faint focus:ring-2 focus:ring-brand focus:border-brand outline-none resize-none font-mono leading-relaxed"
                                placeholder="# Add details\n\n- Requirements\n- Links\n- Ideas"
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                            />
                        ) : (
                            <div className="prose prose-sm prose-invert max-w-none text-text">
                                {taskDef.notes ? (
                                    <ReactMarkdown>{taskDef.notes}</ReactMarkdown>
                                ) : (
                                    <p className="text-text-faint italic">No notes added.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
