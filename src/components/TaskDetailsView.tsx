import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, ScheduledTask } from '../types';
import { MemoIcon, CalendarIcon, CheckIcon, CloseIcon, BackIcon, EditIcon, DiamondIcon, TimelineIcon } from './icons';
import { Checkbox } from './Checkbox';
import { format, parseISO } from 'date-fns';
import { SmartDurationInput } from './ui/SmartDurationInput';

interface TaskDetailsViewProps {
    taskId: string | null;
    tasks: Task[];
    schedule: ScheduledTask[];
    onUpdateTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onClose: () => void;
    initialEditMode?: boolean;
}

export function TaskDetailsView({
    taskId,
    tasks,
    schedule,
    onUpdateTask,
    onDeleteTask,
    onClose,
    initialEditMode = false
}: TaskDetailsViewProps) {
    const [isEditing, setIsEditing] = useState(initialEditMode);
    const [editName, setEditName] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [isMilestoneEditing, setIsMilestoneEditing] = useState(false);
    const [editDuration, setEditDuration] = useState(1);
    const [editDurationUnit, setEditDurationUnit] = useState<'minutes' | 'hours' | 'days'>('days');
    const [editDependencies, setEditDependencies] = useState<string[]>([]);

    // Find the task data
    const taskDef = tasks.find(t => t.id === taskId);
    const taskSched = schedule.find(t => t.id === taskId);

    useEffect(() => {
        if (taskDef) {
            setEditName(taskDef.name);
            setEditNotes(taskDef.notes || '');
            setIsMilestoneEditing(taskDef.is_milestone || false);

            if (taskDef.duration_minutes) {
                if (taskDef.duration_minutes % 1440 === 0) {
                    setEditDuration(taskDef.duration_minutes / 1440);
                    setEditDurationUnit('days');
                } else if (taskDef.duration_minutes % 60 === 0) {
                    setEditDuration(taskDef.duration_minutes / 60);
                    setEditDurationUnit('hours');
                } else {
                    setEditDuration(taskDef.duration_minutes);
                    setEditDurationUnit('minutes');
                }
            } else {
                setEditDuration(taskDef.duration_days);
                setEditDurationUnit('days');
            }

            setEditDependencies(taskDef.dependencies || []);
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
        let durationMinutes: number | undefined = undefined;
        let durationDays = 0;

        if (editDurationUnit === 'days') {
            durationDays = editDuration;
        } else if (editDurationUnit === 'hours') {
            durationMinutes = editDuration * 60;
        } else {
            durationMinutes = editDuration;
        }

        onUpdateTask({
            ...taskDef,
            name: editName,
            notes: editNotes.trim() || undefined,
            is_milestone: isMilestoneEditing,
            duration_days: durationDays,
            duration_minutes: durationMinutes,
            dependencies: editDependencies
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
                        className="mt-1.5 p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
                        title="Back to List"
                    >
                        <BackIcon className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <div className="space-y-3">
                                <input
                                    className="text-2xl font-bold bg-transparent border-none p-0 w-full text-text focus:ring-0 outline-none placeholder:text-text-muted/50"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    placeholder="Task Name"
                                    autoFocus
                                />
                                <div className="flex items-center flex-wrap gap-4 text-sm">
                                    <Checkbox
                                        checked={isMilestoneEditing}
                                        onChange={setIsMilestoneEditing}
                                        label="Milestone"
                                        className="text-text-muted hover:text-text"
                                    />
                                    <div className="w-px h-4 bg-border" />
                                    <div className="flex items-center gap-2">
                                        <SmartDurationInput
                                            value={editDuration}
                                            unit={editDurationUnit}
                                            onChange={(val, unit) => {
                                                setEditDuration(val);
                                                setEditDurationUnit(unit);
                                            }}
                                            className="w-24"
                                        />
                                    </div>
                                    {taskSched && (
                                        <>
                                            <div className="w-px h-4 bg-border" />
                                            <div className="flex items-center gap-1.5 text-text-muted">
                                                <CalendarIcon className="w-4 h-4" />
                                                <span>
                                                    {format(parseISO(taskSched.start_date), 'MMM d')} - {format(parseISO(taskSched.end_date), 'MMM d')}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <h2 className={`text-2xl font-bold text-text flex items-center gap-3 ${taskDef.completed ? 'line-through opacity-60' : ''}`}>
                                    {taskDef.name}
                                    {taskDef.is_milestone && <span className="text-base font-normal no-underline px-2 py-0.5 bg-purple-500/10 text-purple-500 rounded-full text-xs border border-purple-500/20 flex items-center gap-1">Milestone <DiamondIcon className="w-3 h-3" /></span>}
                                    {taskDef.completed && <span className="text-base font-normal no-underline px-2 py-0.5 bg-success/10 text-success rounded-full text-xs">Completed</span>}
                                </h2>

                                <div className="flex items-center gap-4 text-sm text-text-muted">
                                    <span className="font-medium bg-surface-alt px-2 py-0.5 rounded text-xs">{taskDef.duration_days} days</span>
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
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {!isEditing && (
                            <>
                                <button
                                    onClick={toggleCompletion}
                                    className={`p-2 rounded transition-colors ${taskDef.completed
                                        ? 'bg-success/10 text-success hover:bg-success/20'
                                        : 'bg-transparent text-text-muted hover:text-text hover:bg-border'}`}
                                    title={taskDef.completed ? "Mark Incomplete" : "Mark Complete"}
                                >
                                    <CheckIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 bg-transparent text-text-muted hover:text-text hover:bg-border rounded transition-colors"
                                    title="Edit"
                                >
                                    <EditIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => onDeleteTask(taskId)}
                                    className="p-2 bg-transparent text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
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
                                    className="px-3 py-1.5 text-sm font-medium text-text-muted hover:text-text hover:bg-surface-alt rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-3 py-1.5 text-sm font-medium bg-brand text-white hover:bg-brand-hover rounded transition-colors shadow-sm"
                                >
                                    Save
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
                        {!isEditing && (
                            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <MemoIcon className="w-4 h-4" />
                                Notes
                            </h3>
                        )}
                    </div>

                    <div className="flex-1 min-h-[200px] h-full">
                        {isEditing ? (
                            <div className="flex flex-col gap-6 h-full">
                                <div>
                                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2 mb-3">
                                        <TimelineIcon className="w-4 h-4" />
                                        Dependencies
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {tasks.filter(t => t.id !== taskId).length > 0 ? (
                                            tasks
                                                .filter(t => t.id !== taskId)
                                                .map(t => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (editDependencies.includes(t.id)) {
                                                                setEditDependencies(editDependencies.filter(id => id !== t.id));
                                                            } else {
                                                                setEditDependencies([...editDependencies, t.id]);
                                                            }
                                                        }}
                                                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${editDependencies.includes(t.id)
                                                            ? 'bg-brand/10 text-brand ring-1 ring-brand/30'
                                                            : 'bg-surface text-text-muted hover:bg-surface-hover border border-border'
                                                            }`}
                                                    >
                                                        {t.name}
                                                    </button>
                                                ))
                                        ) : (
                                            <p className="text-sm text-text-muted italic">No other tasks available to depend on.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col min-h-[200px]">
                                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2 mb-2">
                                        <MemoIcon className="w-4 h-4" />
                                        Notes
                                    </h3>
                                    <div className="relative flex-1 flex flex-col min-h-[200px]">
                                        {!editNotes && (
                                            <div className="absolute top-4 left-4 text-text-faint pointer-events-none whitespace-pre-line select-none opacity-60">
                                                {`# Add details

- Requirements
- Links
- Ideas`}
                                            </div>
                                        )}
                                        <textarea
                                            className="w-full flex-1 bg-surface border border-border rounded-lg p-4 text-base text-text focus:border-brand focus:ring-0 outline-none resize-none font-mono leading-relaxed transition-colors bg-transparent"
                                            value={editNotes}
                                            onChange={e => setEditNotes(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="prose prose-sm max-w-none text-text">
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
        </div >
    );
}
