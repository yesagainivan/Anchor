import { useState, useEffect } from 'react';
import { Task, ScheduleRequest } from '../types';

interface TaskFormProps {
    onSchedule: (request: ScheduleRequest) => void;
    existingTasks?: Task[];
    existingAnchors?: Record<string, string>;
}

export function TaskForm({ onSchedule, existingTasks = [], existingAnchors = {} }: TaskFormProps) {
    const [tasks, setTasks] = useState<Task[]>(existingTasks);
    const [anchorDate, setAnchorDate] = useState('');
    const [anchorTaskIds, setAnchorTaskIds] = useState<string[]>([]);

    // New task form state
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

        // Reset form
        setNewTaskName('');
        setNewTaskDuration(1);
        setSelectedDependencies([]);

        // Auto-schedule if we have anchors set
        if (anchorDate && anchorTaskIds.length > 0) {
            const anchors: Record<string, string> = {};
            anchorTaskIds.forEach(id => { anchors[id] = anchorDate; });
            onSchedule({ tasks: updatedTasks, anchors });
        }
    };

    const removeTask = (taskId: string) => {
        // Remove task and any dependencies on it
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!anchorDate || tasks.length === 0 || anchorTaskIds.length === 0) {
            return;
        }

        const anchors: Record<string, string> = {};
        anchorTaskIds.forEach(id => { anchors[id] = anchorDate; });
        onSchedule({ tasks, anchors });
    };

    const canSubmit = anchorDate && tasks.length > 0 && anchorTaskIds.length > 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Anchor Date Section */}
            <div className="p-4 border-b border-gray-100 bg-gray-50">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Target Deadline
                </label>
                <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={anchorDate}
                    onChange={(e) => setAnchorDate(e.target.value)}
                />
            </div>

            {/* Add Task Section */}
            <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Task</h3>
                <div className="space-y-3">
                    <input
                        placeholder="Task name"
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTask()}
                    />

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Duration</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    value={newTaskDuration}
                                    onChange={(e) => setNewTaskDuration(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                                <span className="text-xs text-gray-400 whitespace-nowrap">days</span>
                            </div>
                        </div>
                    </div>

                    {/* Dependency Chips */}
                    {tasks.length > 0 && (
                        <div>
                            <label className="block text-xs text-gray-500 mb-1.5">Depends on</label>
                            <div className="flex flex-wrap gap-1.5">
                                {tasks.map(task => (
                                    <button
                                        key={task.id}
                                        type="button"
                                        onClick={() => toggleDependency(task.id)}
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${selectedDependencies.includes(task.id)
                                                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        Add Task
                    </button>
                </div>
            </div>

            {/* Task List */}
            <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Tasks
                    {tasks.length > 0 && <span className="text-gray-400 font-normal ml-1">({tasks.length})</span>}
                </h3>

                {tasks.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No tasks yet. Add your first task above.</p>
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
                                            ? 'border-blue-200 bg-blue-50'
                                            : 'border-gray-200 bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-gray-900 truncate">
                                                    {task.name}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {task.duration_days}d
                                                </span>
                                            </div>
                                            {deps.length > 0 && (
                                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                    After: {deps.join(', ')}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => toggleAnchor(task.id)}
                                                title={isAnchor ? 'Remove anchor' : 'Set as anchor (deadline task)'}
                                                className={`p-1.5 rounded transition-colors ${isAnchor
                                                        ? 'text-blue-600 bg-blue-100'
                                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2C11.45 2 11 2.45 11 3V5.07C7.39 5.56 4.56 8.39 4.07 12H2C1.45 12 1 12.45 1 13C1 13.55 1.45 14 2 14H4.07C4.56 17.61 7.39 20.44 11 20.93V22C11 22.55 11.45 23 12 23C12.55 23 13 22.55 13 22V20.93C16.61 20.44 19.44 17.61 19.93 14H22C22.55 14 23 13.55 23 13C23 12.45 22.55 12 22 12H19.93C19.44 8.39 16.61 5.56 13 5.07V3C13 2.45 12.55 2 12 2ZM12 8C14.76 8 17 10.24 17 13C17 15.76 14.76 18 12 18C9.24 18 7 15.76 7 13C7 10.24 9.24 8 12 8Z" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeTask(task.id)}
                                                className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Submit */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Calculate Schedule
                </button>
                {!canSubmit && tasks.length > 0 && (
                    <p className="text-xs text-gray-400 text-center mt-2">
                        Set a deadline and mark at least one task as an anchor
                    </p>
                )}
            </div>
        </div>
    );
}
