import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, ScheduledTask, SubTask } from '../types';
import { MemoIcon, CalendarIcon, CheckIcon, CloseIcon, BackIcon, EditIcon, DiamondIcon, TimelineIcon, AnchorIcon, PlusIcon } from './icons';
import { Checkbox } from './Checkbox';
import { format, parseISO } from 'date-fns';
import { SmartDurationInput } from './ui/SmartDurationInput';
import { useDebounce } from '../hooks/useDebounce';

interface TaskDetailsViewProps {
    taskId: string | null;
    tasks: Task[];
    schedule: ScheduledTask[];
    onUpdateTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onClose: () => void;
    initialEditMode?: boolean;
    taskAnchorDate?: string;
    onUpdateAnchor?: (taskId: string, date: string) => void;
    onToggleAnchor?: (taskId: string) => void;
}

export function TaskDetailsView({
    taskId,
    tasks,
    schedule,
    onUpdateTask,
    onDeleteTask,
    onClose,
    initialEditMode = false,
    taskAnchorDate,
    onUpdateAnchor,
    onToggleAnchor
}: TaskDetailsViewProps) {
    const [isEditing, setIsEditing] = useState(initialEditMode);

    // Form State
    const [editName, setEditName] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [isMilestoneEditing, setIsMilestoneEditing] = useState(false);
    const [editDuration, setEditDuration] = useState(1);
    const [editDurationUnit, setEditDurationUnit] = useState<'minutes' | 'hours' | 'days'>('days');
    const [editDependencies, setEditDependencies] = useState<string[]>([]);
    const [editAnchorDate, setEditAnchorDate] = useState<string>('');
    const [editSubtasks, setEditSubtasks] = useState<SubTask[]>([]);
    const [newSubtaskName, setNewSubtaskName] = useState('');

    // Autosave State
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isDirty, setIsDirty] = useState(false);
    const prevTaskIdRef = useRef<string | null>(null);
    const saveStatusTimeoutRef = useRef<number | null>(null);

    // Find the task data
    const taskDef = tasks.find(t => t.id === taskId);
    const taskSched = schedule.find(t => t.id === taskId);

    // Refs to track previous state for save-on-switch
    const prevFormDataRef = useRef<typeof formData | null>(null);
    const prevTaskDefRef = useRef<Task | null>(null);

    // Initial Load / Reset - Only when switching to a different task
    // IMPORTANT: Save any pending dirty changes before switching
    useEffect(() => {
        const taskIdChanged = prevTaskIdRef.current !== taskId;

        // Save dirty changes from PREVIOUS task before switching
        if (taskIdChanged && isDirty && prevTaskDefRef.current && prevFormDataRef.current) {
            const prevFormData = prevFormDataRef.current;
            const prevTask = prevTaskDefRef.current;

            let durationMinutes: number | undefined = undefined;
            let durationDays = 0;
            if (prevFormData.editDurationUnit === 'days') {
                durationDays = prevFormData.editDuration;
            } else if (prevFormData.editDurationUnit === 'hours') {
                durationMinutes = prevFormData.editDuration * 60;
            } else {
                durationMinutes = prevFormData.editDuration;
            }

            onUpdateTask({
                ...prevTask,
                name: prevFormData.editName,
                notes: prevFormData.editNotes.trim() || undefined,
                is_milestone: prevFormData.isMilestoneEditing,
                duration_days: durationDays,
                duration_minutes: durationMinutes,
                dependencies: prevFormData.editDependencies,
                subtasks: prevFormData.editSubtasks
            });
        }

        prevTaskIdRef.current = taskId;

        // Reset form state for new task
        if (taskDef && taskIdChanged) {
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
            setEditAnchorDate(taskAnchorDate || '');
            setEditSubtasks(taskDef.subtasks || []);
            setNewSubtaskName('');
            setIsDirty(false);
            setSaveStatus('idle');
            setIsEditing(initialEditMode);
        }

        // Update refs for next switch
        prevTaskDefRef.current = taskDef || null;
    }, [taskId, taskDef, initialEditMode, isDirty, onUpdateTask]);

    useEffect(() => {
        if (!isEditing && taskDef && !isDirty) {
            setEditName(taskDef.name);
            setEditNotes(taskDef.notes || '');
            setIsMilestoneEditing(taskDef.is_milestone || false);
            // Duration logic... might be complex to repeat, but essential for sync. 
            // Ideally we extract the "init form from task" logic.
            // For now, let's just sync subtasks and basics that might be toggled in view mode (like completion?). 
            // Actually, completion is not part of form state except via taskDef.completed.
            setEditSubtasks(taskDef.subtasks || []);
        }
    }, [taskDef, isEditing, isDirty]);

    // === DEBOUNCED AUTOSAVE PATTERN ===
    // Create a stable form data object for debouncing
    const formData = useMemo(() => ({
        editName,
        editNotes,
        isMilestoneEditing,
        editDuration,
        editDurationUnit,
        editDependencies,
        editAnchorDate,
        editSubtasks
    }), [editName, editNotes, isMilestoneEditing, editDuration, editDurationUnit, editDependencies, editAnchorDate, editSubtasks]);

    // Debounce the form data - save only triggers after user stops typing for 1.5s
    const debouncedFormData = useDebounce(formData, 1500);

    // Helper to build task from form data
    const buildTaskFromFormData = (data: typeof formData): Task | null => {
        if (!taskDef) return null;

        let durationMinutes: number | undefined = undefined;
        let durationDays = 0;

        if (data.editDurationUnit === 'days') {
            durationDays = data.editDuration;
        } else if (data.editDurationUnit === 'hours') {
            durationMinutes = data.editDuration * 60;
        } else {
            durationMinutes = data.editDuration;
        }

        return {
            ...taskDef,
            name: data.editName,
            notes: data.editNotes.trim() || undefined,
            is_milestone: data.isMilestoneEditing,
            duration_days: durationDays,
            duration_minutes: durationMinutes,
            dependencies: data.editDependencies,
            subtasks: data.editSubtasks
        };
    };

    // Autosave Effect - reacts to debounced form data changes
    useEffect(() => {
        // Only save if editing AND dirty
        if (!isEditing || !isDirty) return;

        const updatedTask = buildTaskFromFormData(debouncedFormData);
        if (!updatedTask) return;

        setSaveStatus('saving');
        onUpdateTask(updatedTask);

        // Also save anchor if changed
        if (onUpdateAnchor && onToggleAnchor && taskDef) {
            // Check if anchor changed
            if (editAnchorDate !== (taskAnchorDate || '')) {
                if (editAnchorDate) {
                    onUpdateAnchor(taskDef.id, editAnchorDate);
                } else if (taskAnchorDate) {
                    // If cleared, we toggle it off
                    // Note: toggleAnchor logic in useProject toggles existence. 
                    // If we want to strictly remove, we might need to check if it exists first.
                    // But here we know it existed (taskAnchorDate was set).
                    onToggleAnchor(taskDef.id);
                }
            }
        }

        // Clear any existing timeout
        if (saveStatusTimeoutRef.current) {
            window.clearTimeout(saveStatusTimeoutRef.current);
        }

        // Show 'saved' after a brief delay for visual feedback
        saveStatusTimeoutRef.current = window.setTimeout(() => {
            setSaveStatus('saved');
            setIsDirty(false);

            // Hide indicator after 2s
            saveStatusTimeoutRef.current = window.setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        }, 200);

        return () => {
            if (saveStatusTimeoutRef.current) {
                window.clearTimeout(saveStatusTimeoutRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedFormData]); // Only react to debounced data changes

    // Manual save function (for Done button, closing, and Cmd+S)
    const handleManualSave = () => {
        const updatedTask = buildTaskFromFormData(formData);
        if (updatedTask && isDirty) {
            setSaveStatus('saving');
            onUpdateTask(updatedTask);

            // Manual save for anchor too
            if (onUpdateAnchor && onToggleAnchor && taskDef) {
                if (editAnchorDate !== (taskAnchorDate || '')) {
                    if (editAnchorDate) {
                        onUpdateAnchor(taskDef.id, editAnchorDate);
                    } else if (taskAnchorDate) {
                        onToggleAnchor(taskDef.id);
                    }
                }
            }

            setIsDirty(false);

            // Brief visual feedback
            setTimeout(() => {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            }, 200);
        }
    };

    // Track formData for save-on-switch
    useEffect(() => {
        prevFormDataRef.current = formData;
    }, [formData]);

    // Keyboard shortcuts: Cmd+S to save, Escape to exit edit mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+S / Ctrl+S: immediate save
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                if (isEditing && isDirty) {
                    handleManualSave();
                }
            }

            // Escape: save and exit edit mode (like Done button)
            if (e.key === 'Escape' && isEditing) {
                e.preventDefault();
                handleManualSave();
                setIsEditing(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing, isDirty, formData]); // Include formData to get latest values

    // Change handler wrapper to set dirty flag
    const handleValueChange = <T,>(setter: (val: T) => void, val: T) => {
        setter(val);
        setIsDirty(true);
    };

    if (!taskId || !taskDef) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
                <div className="w-16 h-16 bg-surface-alt/20 rounded-full flex items-center justify-center mb-4">
                    <MemoIcon className="w-8 h-8 opacity-50" />
                </div>
                <p>Select a task to view details</p>
            </div>
        );
    }

    const handleDoneEditing = () => {
        handleManualSave();
        setIsEditing(false);
    };

    const toggleCompletion = () => {
        onUpdateTask({
            ...taskDef,
            completed: !taskDef.completed
        });
    };

    const handleCloseInternal = () => {
        if (isDirty && isEditing) {
            handleManualSave();
        }
        onClose();
    };

    return (
        <div className="h-full flex flex-col bg-surface overflow-hidden rounded-xl border border-border">
            {/* Header */}
            <div className="p-4 border-b border-border bg-surface flex items-start justify-between gap-4">
                <div className="flex-1 flex items-start gap-3">
                    <button
                        onClick={handleCloseInternal}
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
                                    onChange={e => handleValueChange(setEditName, e.target.value)}
                                    placeholder="Task Name"
                                    autoFocus
                                />
                                <div className="flex items-center flex-wrap gap-4 text-sm">
                                    <Checkbox
                                        checked={isMilestoneEditing}
                                        onChange={(val) => handleValueChange(setIsMilestoneEditing, val)}
                                        label="Milestone"
                                        className="text-text-muted hover:text-text"
                                    />
                                    <div className="w-px h-4 bg-border" />
                                    <div className="flex items-center gap-2">
                                        <SmartDurationInput
                                            value={editDuration}
                                            unit={editDurationUnit}
                                            onChange={(val, unit) => {
                                                handleValueChange(setEditDuration, val);
                                                handleValueChange(setEditDurationUnit, unit);
                                            }}
                                            className="w-24"
                                        />
                                    </div>
                                    <div className="w-px h-4 bg-border" />

                                    {/* Anchor Date Input */}
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1 rounded ${editAnchorDate ? 'text-brand bg-brand/10' : 'text-text-muted bg-surface-alt'}`}>
                                            <AnchorIcon className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="datetime-local"
                                            className="bg-transparent border-none p-0 text-text text-sm focus:ring-0 outline-none"
                                            value={editAnchorDate.length > 16 ? editAnchorDate.slice(0, 16) : editAnchorDate}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                handleValueChange(setEditAnchorDate, val.length === 16 ? `${val}:00` : val);
                                            }}
                                            placeholder="Set Deadline"
                                        />
                                        {editAnchorDate && (
                                            <button
                                                onClick={() => handleValueChange(setEditAnchorDate, '')}
                                                className="text-text-muted hover:text-text"
                                                title="Clear Anchor"
                                            >
                                                <CloseIcon className="w-3 h-3" />
                                            </button>
                                        )}
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

                                    {/* Read-only Anchor Display */}
                                    {taskAnchorDate && (
                                        <div className="flex items-center gap-1.5 text-brand" title="Anchored Deadline">
                                            <AnchorIcon className="w-4 h-4" />
                                            <span>
                                                {format(parseISO(taskAnchorDate), 'MMM d, HH:mm')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Autosave Indicator */}
                        {isEditing && (saveStatus === 'saving' || saveStatus === 'saved') && (
                            <div className="flex items-center mr-2" title={saveStatus === 'saving' ? 'Saving...' : 'Saved'}>
                                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-success'}`} />
                            </div>
                        )}

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
                                    onClick={handleDoneEditing}
                                    className="px-3 py-1.5 text-sm font-medium text-text-muted hover:text-text hover:bg-surface-alt rounded transition-colors"
                                >
                                    Done
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
                                        <CheckIcon className="w-4 h-4" />
                                        Checklist
                                    </h3>
                                    <div className="space-y-2 mb-2">
                                        {editSubtasks.map(st => (
                                            <div key={st.id} className="flex items-center gap-2 group">
                                                <Checkbox
                                                    checked={st.completed}
                                                    onChange={(checked) => {
                                                        const newSts = editSubtasks.map(s => s.id === st.id ? { ...s, completed: checked } : s);
                                                        handleValueChange(setEditSubtasks, newSts);
                                                    }}
                                                />
                                                <input
                                                    className="flex-1 bg-transparent border-none p-0 text-sm text-text focus:ring-0 placeholder:text-text-muted/50"
                                                    value={st.name}
                                                    onChange={e => {
                                                        const newSts = editSubtasks.map(s => s.id === st.id ? { ...s, name: e.target.value } : s);
                                                        handleValueChange(setEditSubtasks, newSts);
                                                    }}
                                                    placeholder="Subtask name"
                                                />
                                                <button onClick={() => {
                                                    const newSts = editSubtasks.filter(s => s.id !== st.id);
                                                    handleValueChange(setEditSubtasks, newSts);
                                                }}
                                                    className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                >
                                                    <CloseIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2 pl-[3px]">
                                            <div className="w-4 flex justify-center"><PlusIcon className="w-3.5 h-3.5 text-text-muted" /></div>
                                            <input
                                                className="flex-1 bg-transparent border-none p-0 text-sm text-text placeholder:text-text-muted/70 focus:ring-0"
                                                placeholder="Add subtask..."
                                                value={newSubtaskName}
                                                onChange={e => setNewSubtaskName(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && newSubtaskName.trim()) {
                                                        const newSt = { id: crypto.randomUUID(), name: newSubtaskName.trim(), completed: false };
                                                        handleValueChange(setEditSubtasks, [...editSubtasks, newSt]);
                                                        setNewSubtaskName('');
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
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
                                                            const newDeps = editDependencies.includes(t.id)
                                                                ? editDependencies.filter(id => id !== t.id)
                                                                : [...editDependencies, t.id];
                                                            handleValueChange(setEditDependencies, newDeps);
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
                                            onChange={e => handleValueChange(setEditNotes, e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="prose prose-sm max-w-none text-text">
                                {taskDef.subtasks && taskDef.subtasks.length > 0 && (
                                    <div className="mb-6 not-prose">
                                        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2 mb-3">
                                            <CheckIcon className="w-4 h-4" />
                                            Checklist
                                        </h3>
                                        <div className="space-y-2">
                                            {taskDef.subtasks.map(st => (
                                                <div key={st.id} className="flex items-start gap-2 group">
                                                    <Checkbox
                                                        checked={st.completed}
                                                        onChange={(checked) => {
                                                            const newSubtasks = (taskDef.subtasks || []).map(s => s.id === st.id ? { ...s, completed: checked } : s);
                                                            onUpdateTask({ ...taskDef, subtasks: newSubtasks });
                                                        }}
                                                    />
                                                    <span className={`text-sm mt-0.5 ${st.completed ? 'text-text-muted line-through' : 'text-text'}`}>
                                                        {st.name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
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
