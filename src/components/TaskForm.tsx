import { useState, useEffect } from 'react';
import { Task, ScheduleRequest } from '../types';
import { AnchorIcon, CloseIcon } from './icons';

interface TaskFormProps {
    onSchedule: (request: ScheduleRequest) => void;
    existingTasks?: Task[];
    existingAnchors?: Record<string, string>;
}

export function TaskForm({ onSchedule, existingTasks = [], existingAnchors = {} }: TaskFormProps) {
    const [tasks, setTasks] = useState<Task[]>(existingTasks);
    const [anchorDate, setAnchorDate] = useState('');
    const [anchorTaskIds, setAnchorTaskIds] = useState<string[]>([]);

    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskDuration, setNewTaskDuration] = useState(1);
    const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);

    useEffect(() => {
        setTasks(existingTasks);
        const ids = Object.keys(existingAnchors);
        if (ids.length > 0) {
            setAnchorTaskIds(ids);
            setAnchorDate(existingAnchors[ids[0]]);
        }
    }, [existingTasks, existingAnchors]);

    // Auto-recalculate when anchors change
    useEffect(() => {
        if (anchorDate && tasks.length > 0 && anchorTaskIds.length > 0) {
            const anchors: Record<string, string> = {};
            anchorTaskIds.forEach(id => { anchors[id] = anchorDate; });
            onSchedule({ tasks, anchors });
        }
    }, [anchorDate, anchorTaskIds, tasks, onSchedule]);

    const addTask = () => {
        if (!newTaskName.trim()) return;

        const newTask: Task = {
            id: crypto.randomUUID(),
            name: newTaskName.trim(),
            duration_days: newTaskDuration,
            dependencies: selectedDependencies,
        };

        const updatedTasks = [...tasks, newTask];
        setTasks(updatedTasks);

        setNewTaskName('');
        setNewTaskDuration(1);
        setSelectedDependencies([]);

        if (anchorDate && anchorTaskIds.length > 0) {
            const anchors: Record<string, string> = {};
            anchorTaskIds.forEach(id => { anchors[id] = anchorDate; });
            onSchedule({ tasks: updatedTasks, anchors });
        }
    };

    const removeTask = (taskId: string) => {
        const updatedTasks = tasks
            .filter(t => t.id !== taskId)
            .map(t => ({
                ...t,
                dependencies: t.dependencies.filter(d => d !== taskId)
            }));
        setTasks(updatedTasks);
        setAnchorTaskIds(anchorTaskIds.filter(id => id !== taskId));
    };

    const toggleAnchor = (taskId: string) => {
        setAnchorTaskIds(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    };

    const toggleDependency = (taskId: string) => {
        setSelectedDependencies(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    };

    return (
        <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
            {/* Anchor Date Section */}
            <div className="p-4 border-b border-border-muted bg-surface-alt">
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Target Deadline
                </label>
                <input
                    type="date"
                    className="w-full bg-surface border border-border rounded-lg p-2.5 text-sm text-text focus:ring-2 focus:ring-brand focus:border-brand outline-none"
                    value={anchorDate}
                    onChange={(e) => setAnchorDate(e.target.value)}
                />
            </div>

            {/* Add Task Section */}
            <div className="p-4 border-b border-border-muted">
                <h3 className="text-sm font-semibold text-text mb-3">Add Task</h3>
                <div className="space-y-3">
                    <input
                        placeholder="Task name"
                        className="w-full bg-surface border border-border rounded-lg p-2.5 text-sm text-text placeholder:text-text-faint focus:ring-2 focus:ring-brand focus:border-brand outline-none"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTask()}
                    />

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-xs text-text-muted mb-1">Duration</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full bg-surface border border-border rounded-lg p-2 text-sm text-text focus:ring-2 focus:ring-brand focus:border-brand outline-none"
                                    value={newTaskDuration}
                                    onChange={(e) => setNewTaskDuration(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                                <span className="text-xs text-text-faint whitespace-nowrap">days</span>
                            </div>
                        </div>
                    </div>

                    {tasks.length > 0 && (
                        <div>
                            <label className="block text-xs text-text-muted mb-1.5">Depends on</label>
                            <div className="flex flex-wrap gap-1.5">
                                {tasks.map(task => (
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

                    <button
                        type="button"
                        onClick={addTask}
                        disabled={!newTaskName.trim()}
                        className="w-full bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        Add Task
                    </button>
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

                            return (
                                <li
                                    key={task.id}
                                    className={`p-3 rounded-lg border transition-all ${isAnchor
                                        ? 'border-brand/30 bg-brand/5'
                                        : 'border-border bg-surface-alt'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-text truncate">
                                                    {task.name}
                                                </span>
                                                <span className="text-xs text-text-faint">
                                                    {task.duration_days}d
                                                </span>
                                            </div>
                                            {deps.length > 0 && (
                                                <p className="text-xs text-text-muted mt-0.5 truncate">
                                                    After: {deps.join(', ')}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => toggleAnchor(task.id)}
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
                                                onClick={() => removeTask(task.id)}
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
        </div>
    );
}
