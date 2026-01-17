import { useState } from 'react';
import { Task } from '../types';
import { AnchorIcon, CloseIcon, EditIcon, CheckIcon, MemoIcon, DiamondIcon, ChevronRightIcon, ChevronDownIcon } from './icons';
import { Checkbox } from './Checkbox';
import { SmartDurationInput } from './ui/SmartDurationInput';

interface TaskFormProps {
    tasks: Task[];
    anchorTaskIds: string[];
    anchorDate: string;
    onAddTask: (task: Task) => void;
    onRemoveTask: (taskId: string) => void;
    onToggleAnchor: (taskId: string) => void;
    onAnchorDateChange: (date: string) => void;
    onEditTask: (task: Task) => void;
    onOpenDetails: (taskId: string, editMode?: boolean) => void;
}

export function TaskForm({
    tasks,
    anchorTaskIds,
    anchorDate,
    onAddTask,
    onRemoveTask,
    onToggleAnchor,
    onAnchorDateChange,
    onEditTask,
    onOpenDetails
}: TaskFormProps) {
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskDuration, setNewTaskDuration] = useState(1);
    const [durationUnit, setDurationUnit] = useState<'days' | 'hours' | 'minutes'>('days');
    const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
    const [newTaskNotes, setNewTaskNotes] = useState('');
    const [isMilestone, setIsMilestone] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [isFormCollapsed, setIsFormCollapsed] = useState(true);

    const handleSubmit = () => {
        if (!newTaskName.trim()) return;

        if (editingTaskId) {
            // Keep internal edit logic just in case, but primary edit is now external
            const originalTask = tasks.find(t => t.id === editingTaskId);
            const updatedTask: Task = {
                id: editingTaskId,
                name: newTaskName.trim(),
                duration_days: newTaskDuration,
                dependencies: selectedDependencies,
                completed: originalTask?.completed || false,
                notes: newTaskNotes.trim() || undefined,
                is_milestone: isMilestone,
            };
            onEditTask(updatedTask);
            setEditingTaskId(null);
        } else {
            const newTask: Task = {
                id: crypto.randomUUID(),
                name: newTaskName.trim(),
                duration_days: durationUnit === 'days' ? newTaskDuration : 0,
                duration_minutes: durationUnit === 'minutes' ? newTaskDuration : durationUnit === 'hours' ? newTaskDuration * 60 : undefined,
                dependencies: selectedDependencies,
                notes: newTaskNotes.trim() || undefined,
                is_milestone: isMilestone,
            };
            onAddTask(newTask);
        }

        setNewTaskName('');
        setNewTaskDuration(1);
        setSelectedDependencies([]);
        setNewTaskNotes('');
        setIsMilestone(false);
    };

    const handleStartEdit = (task: Task) => {
        // Redirect to details view instead of inline edit
        onOpenDetails(task.id, true);
    };

    const handleCancelEdit = () => {
        setEditingTaskId(null);
        setNewTaskName('');
        setNewTaskDuration(1);
        setSelectedDependencies([]);
        setNewTaskNotes('');
        setIsMilestone(false);
    };

    const toggleDependency = (taskId: string) => {
        setSelectedDependencies(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    };

    return (
        <div className="bg-surface/50 rounded-xl border border-border overflow-hidden">
            {/* Anchor Date Section */}
            <div className="p-4 border-b border-border-muted bg-surface-alt/50">
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Target Deadline
                </label>
                <input
                    type="datetime-local"
                    className="w-full bg-surface border border-border rounded-lg p-2.5 text-sm text-text focus:border-brand focus:ring-0 outline-none transition-colors"
                    value={anchorDate.length > 16 ? anchorDate.slice(0, 16) : anchorDate}
                    onChange={(e) => {
                        const val = e.target.value;
                        // Build full ISO string with seconds if missing
                        onAnchorDateChange(val.length === 16 ? `${val}:00` : val);
                    }}
                />
            </div>

            {/* Add/Edit Task Section */}
            <div className="p-4 border-b border-border-muted transition-all duration-300 ease-in-out">
                <button
                    onClick={() => setIsFormCollapsed(!isFormCollapsed)}
                    className="flex items-center gap-2 text-sm font-semibold text-text w-full hover:opacity-80 transition-opacity"
                >
                    {isFormCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                    {editingTaskId ? 'Edit Task' : 'Add Task'}
                </button>

                <div className={`space-y-3 p-1 -m-1 transition-all duration-300 ease-in-out overflow-hidden ${isFormCollapsed && !editingTaskId ? 'max-h-0 opacity-0 mt-0 pt-0 pb-0' : 'max-h-[500px] opacity-100 mt-3 p-1'}`}>
                    <input
                        placeholder="Task name"
                        className="w-full bg-surface border border-border rounded-lg p-2.5 text-sm text-text placeholder:text-text-faint focus:border-brand focus:ring-0 outline-none transition-colors"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-xs text-text-muted mb-1">Duration</label>
                            <SmartDurationInput
                                value={newTaskDuration}
                                unit={durationUnit}
                                onChange={(val, unit) => {
                                    setNewTaskDuration(val);
                                    setDurationUnit(unit);
                                }}
                            />
                        </div>
                    </div>

                    {tasks.length > 0 && (
                        <div>
                            <label className="block text-xs text-text-muted mb-1.5">Depends on</label>
                            <div className="flex flex-wrap gap-1.5">
                                {tasks
                                    .filter(task => task.id !== editingTaskId) // Prevent self-dependency
                                    .map(task => (
                                        <button
                                            key={task.id}
                                            type="button"
                                            onClick={() => toggleDependency(task.id)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${selectedDependencies.includes(task.id)
                                                ? 'bg-brand/10 text-brand ring-1 ring-brand/30'
                                                : 'bg-surface-alt text-text-muted hover:bg-border'
                                                }`}
                                        >
                                            {task.name}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs text-text-muted mb-1">Notes</label>
                        <textarea
                            className="w-full bg-surface border border-border rounded-lg p-2.5 text-sm text-text placeholder:text-text-faint focus:border-brand focus:ring-0 outline-none min-h-[80px] transition-colors"
                            placeholder="Add details, requirements, or links (Markdown supported)"
                            value={newTaskNotes}
                            onChange={(e) => setNewTaskNotes(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={isMilestone}
                            onChange={setIsMilestone}
                            label="Mark as Milestone"
                            className="text-sm text-text"
                        />
                    </div>

                    <div className="flex gap-2">
                        {editingTaskId && (
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="flex-1 bg-surface-alt text-text-muted py-2 rounded-lg text-sm font-medium hover:bg-border transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!newTaskName.trim()}
                            className={`flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
                        >
                            {editingTaskId ? 'Update Task' : 'Add Task'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Task List */}
            <div className="p-4">
                <h3 className="text-sm font-semibold text-text mb-3">
                    Tasks
                    {tasks.length > 0 && <span className="text-text-faint font-normal ml-1">({tasks.length})</span>}
                </h3>

                {tasks.length === 0 ? (
                    <p className="text-sm text-text-faint italic">No tasks yet. Add your first task above.</p>
                ) : (
                    <ul className="space-y-2">
                        {tasks.map(task => {
                            const isAnchor = anchorTaskIds.includes(task.id);
                            const deps = task.dependencies
                                .map(d => tasks.find(t => t.id === d)?.name)
                                .filter(Boolean);

                            // Toggle completion handler
                            const toggleCompletion = () => {
                                onEditTask({
                                    ...task,
                                    completed: !task.completed
                                });
                            };

                            return (
                                <li
                                    key={task.id}
                                    className={`p-3 rounded-lg border transition-all ${isAnchor
                                        ? 'border-brand/30 bg-brand/5'
                                        : 'border-border bg-surface-alt'
                                        } ${task.completed ? 'opacity-60' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div
                                            className="flex-1 min-w-0 flex items-start gap-3 cursor-pointer"
                                            onClick={() => onOpenDetails(task.id)}
                                        >
                                            {/* Completion Toggle */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleCompletion();
                                                }}
                                                className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.completed
                                                    ? 'bg-success border-success text-white'
                                                    : 'bg-surface border-text-muted/40 hover:border-brand'
                                                    }`}
                                            >
                                                {task.completed && <CheckIcon className="w-3.5 h-3.5" />}
                                            </button>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-medium text-sm truncate ${task.completed ? 'text-text-muted line-through' : 'text-text'}`}>
                                                        {task.name}
                                                    </span>
                                                    <span className="text-xs text-text-faint">
                                                        {task.duration_minutes
                                                            ? (task.duration_minutes >= 60
                                                                ? `${Math.round(task.duration_minutes / 60 * 10) / 10}h`
                                                                : `${task.duration_minutes}m`)
                                                            : `${task.duration_days}d`}
                                                    </span>
                                                    {task.is_milestone && (
                                                        <span className="text-purple-500" title="Milestone">
                                                            <DiamondIcon className="w-3.5 h-3.5" />
                                                        </span>
                                                    )}
                                                    {task.notes && (
                                                        <span className="text-text-faint" title="Has notes">
                                                            <MemoIcon className="w-3.5 h-3.5" />
                                                        </span>
                                                    )}
                                                </div>
                                                {deps.length > 0 && (
                                                    <p className={`text-xs text-text-muted mt-0.5 truncate ${task.completed ? 'line-through opacity-70' : ''}`}>
                                                        After: {deps.join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => onToggleAnchor(task.id)}
                                                title={isAnchor ? 'Remove anchor' : 'Set as anchor'}
                                                className={`p-1.5 rounded transition-colors ${isAnchor
                                                    ? 'text-brand bg-brand/10'
                                                    : 'text-text-faint hover:text-text-muted hover:bg-surface-alt'
                                                    }`}
                                            >
                                                <AnchorIcon />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStartEdit(task)}
                                                className="p-1.5 rounded text-text-faint hover:text-brand hover:bg-brand/10 transition-colors"
                                                title="Edit task"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onRemoveTask(task.id)}
                                                className="p-1.5 rounded text-text-faint hover:text-danger hover:bg-danger/10 transition-colors"
                                            >
                                                <CloseIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div >
    );
}
