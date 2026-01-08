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

    // New task state
    const [newTaskName, setNewTaskName] = useState('');

    useEffect(() => {
        setTasks(existingTasks);
        const anchorIds = Object.keys(existingAnchors);
        if (anchorIds.length > 0) {
            setAnchorTaskIds(anchorIds);
            setAnchorDate(existingAnchors[anchorIds[0]]);
        }
    }, [existingTasks, existingAnchors]);
    const [newTaskDuration, setNewTaskDuration] = useState(1);
    const [newTaskDependencies, setNewTaskDependencies] = useState<string[]>([]);
    const [newTaskPrerequisiteFor, setNewTaskPrerequisiteFor] = useState<string[]>([]); // "Reverse" dependencies

    // Tasks that are "anchored" (roots of the reverse tree)
    const [anchorTaskIds, setAnchorTaskIds] = useState<string[]>([]);

    const addTask = () => {
        if (!newTaskName) return;
        const newTaskId = crypto.randomUUID();
        const newTask: Task = {
            id: newTaskId,
            name: newTaskName,
            duration_days: newTaskDuration,
            dependencies: newTaskDependencies,
        };

        // If this new task is a prerequisite for existing tasks (e.g. Research is Prereq for Design),
        // we must update "Design" to include "Research" (newTaskId) in its dependencies.
        let updatedTasks = [...tasks, newTask];
        if (newTaskPrerequisiteFor.length > 0) {
            updatedTasks = updatedTasks.map(t => {
                if (newTaskPrerequisiteFor.includes(t.id)) {
                    return {
                        ...t,
                        dependencies: [...t.dependencies, newTaskId]
                    };
                }
                return t;
            });
        }

        setTasks(updatedTasks);
        setNewTaskName('');
        setNewTaskDuration(1);
        setNewTaskDependencies([]);
        setNewTaskPrerequisiteFor([]);
    };

    const toggleAnchorData = (taskId: string) => {
        if (anchorTaskIds.includes(taskId)) {
            setAnchorTaskIds(anchorTaskIds.filter(id => id !== taskId));
        } else {
            setAnchorTaskIds([...anchorTaskIds, taskId]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!anchorDate || tasks.length === 0 || anchorTaskIds.length === 0) {
            alert("Please set an anchor date, add tasks, and select at least one anchor task.");
            return;
        }

        // Convert legacy form state to new anchors map
        const anchors: Record<string, string> = {};
        anchorTaskIds.forEach(id => {
            anchors[id] = anchorDate;
        });

        onSchedule({
            tasks,
            anchors,
        });
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow space-y-4 text-left">
            <h2 className="text-xl font-bold">Plan Setup</h2>

            <div>
                <label className="block text-sm font-medium">Anchor Date (Finish Line)</label>
                <input
                    type="date"
                    className="mt-1 block w-full border rounded p-2"
                    value={anchorDate}
                    onChange={(e) => setAnchorDate(e.target.value)}
                />
            </div>

            <div className="border-t pt-4">
                <h3 className="font-semibold">Add Task</h3>
                <div className="grid grid-cols-1 gap-2 mt-2">
                    <input
                        placeholder="Task Name"
                        className="border p-2 rounded"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-xs">Duration (Days)</label>
                            <input
                                type="number"
                                min="1"
                                className="border p-2 rounded w-full"
                                value={newTaskDuration}
                                onChange={(e) => setNewTaskDuration(parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                    {/* Simple dependency selector */}
                    {tasks.length > 0 && (
                        <div className="grid grid-cols-1 gap-2">
                            <div>
                                <label className="text-xs font-semibold">Prerequisites (Must finish BEFORE this starts)</label>
                                <select
                                    multiple
                                    className="w-full border p-2 rounded h-20 text-sm"
                                    value={newTaskDependencies}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setNewTaskDependencies(selected);
                                    }}
                                >
                                    {tasks.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-blue-600">Is Prerequisite For (Must finish BEFORE these start)</label>
                                <div className="text-[10px] text-gray-500 mb-1">Use this to insert tasks *before* existing ones (e.g. Research before Design)</div>
                                <select
                                    multiple
                                    className="w-full border p-2 rounded h-20 text-sm"
                                    value={newTaskPrerequisiteFor}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setNewTaskPrerequisiteFor(selected);
                                    }}
                                >
                                    {tasks.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                    <button
                        type="button"
                        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                        onClick={addTask}
                    >
                        Add Task
                    </button>
                </div>
            </div>

            <div className="border-t pt-4">
                <h3 className="font-semibold">Tasks List</h3>
                {tasks.length === 0 && <p className="text-gray-500 italic">No tasks yet.</p>}
                <ul className="space-y-2 mt-2">
                    {tasks.map(task => (
                        <li key={task.id} className="border p-2 rounded flex justify-between items-center bg-gray-50">
                            <div>
                                <span className="font-medium">{task.name}</span>
                                <span className="text-sm text-gray-500 ml-2">({task.duration_days} days)</span>
                                {task.dependencies.length > 0 && (
                                    <div className="text-xs text-gray-600">
                                        Depends on: {task.dependencies.map(d => tasks.find(t => t.id === d)?.name).join(', ')}
                                    </div>
                                )}
                            </div>
                            <label className="flex items-center space-x-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={anchorTaskIds.includes(task.id)}
                                    onChange={() => toggleAnchorData(task.id)}
                                />
                                <span>Is Anchor?</span>
                            </label>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="pt-4">
                <button
                    onClick={handleSubmit}
                    className="w-full bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                    Generate Retro Plan
                </button>
            </div>
        </div>
    );
}
