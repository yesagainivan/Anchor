import { useState } from 'react';
import { Task, ScheduleRequest } from '../types';

interface TaskFormProps {
    onSchedule: (request: ScheduleRequest) => void;
}

export function TaskForm({ onSchedule }: TaskFormProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [anchorDate, setAnchorDate] = useState('');

    // New task state
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskDuration, setNewTaskDuration] = useState(1);
    const [newTaskDependencies, setNewTaskDependencies] = useState<string[]>([]);

    // Tasks that are "anchored" (roots of the reverse tree)
    const [anchorTaskIds, setAnchorTaskIds] = useState<string[]>([]);

    const addTask = () => {
        if (!newTaskName) return;
        const newTask: Task = {
            id: crypto.randomUUID(),
            name: newTaskName,
            duration_days: newTaskDuration,
            dependencies: newTaskDependencies,
        };
        setTasks([...tasks, newTask]);
        setNewTaskName('');
        setNewTaskDuration(1);
        setNewTaskDependencies([]);
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
        onSchedule({
            tasks,
            anchor_date: anchorDate,
            anchor_task_ids: anchorTaskIds,
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
                        <div>
                            <label className="text-xs">Prerequisites (Must finish before this starts)</label>
                            <select
                                multiple
                                className="w-full border p-2 rounded h-24"
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
                            <p className="text-xs text-gray-500">Cmd/Ctrl+Click to select multiple</p>
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
