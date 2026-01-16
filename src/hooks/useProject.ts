import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Project, ScheduledTask, Task } from "../types";

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export function useProject(projectId: string | null) {
    const [project, setProject] = useState<Project | null>(null);
    const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [anchorDate, setAnchorDate] = useState<string>("");

    // Ref to track if we have unsaved changes
    const isDirty = useRef(false);

    // Load project when ID changes
    useEffect(() => {
        if (!projectId) {
            setProject(null);
            setScheduledTasks([]);
            return;
        }

        const load = async () => {
            setLoading(true);
            try {
                const loaded: Project = await invoke("load_project", { id: projectId });
                setProject(loaded);
                isDirty.current = false; // Reset dirty flag after load

                // Set initial anchor date if any anchors exist
                const anchorIds = Object.keys(loaded.anchors);
                if (anchorIds.length > 0) {
                    setAnchorDate(loaded.anchors[anchorIds[0]]);
                }
            } catch (e) {
                console.error(e);
                setError(typeof e === 'string' ? e : "Failed to load project");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [projectId]);

    // Schedule calculation
    const calculateSchedule = useCallback(async (currentProject: Project, currentAnchorDate: string) => {
        const anchorIds = Object.keys(currentProject.anchors);
        if (currentProject.tasks.length === 0 || anchorIds.length === 0) {
            setScheduledTasks([]);
            return;
        }

        try {
            // Respect the individual anchor dates in the project!
            const effectiveAnchors = currentProject.anchors;

            // Sync with project state
            const updatedProject = { ...currentProject, anchors: effectiveAnchors };

            const result = await invoke<ScheduledTask[]>("schedule", {
                request: { tasks: updatedProject.tasks, anchors: effectiveAnchors }
            });
            setScheduledTasks(result);
            setError(null);
        } catch (e) {
            console.error(e);
            setError(typeof e === 'string' ? e : "Scheduling failed");
        }
    }, []);

    // Effect to run schedule when project data changes
    useEffect(() => {
        if (project) {
            calculateSchedule(project, anchorDate);
        }
    }, [project, anchorDate, calculateSchedule]);

    // Auto-save logic
    const debouncedProject = useDebounce(project, 1000);
    useEffect(() => {
        if (debouncedProject && projectId && isDirty.current) {
            invoke("save_project", { project: debouncedProject }).then(() => {
                // We don't necessarily reset dirty here because new changes might be pending?
                // But for this simple implementation, if we saved, we are clean relative to that state.
                // However, debouncedProject is behind real state.
                // Safest is to leave dirty=true until next load, OR assume save is successful for that snapshot.
                // Actually, if we don't reset isDirty, we will save unchanged project again?
                // No, debouncedProject only updates if project changes.
                // So the effect only runs when project changes.
                // So checking isDirty inside the effect is correct.
            }).catch(e => {
                console.error("Auto-save failed:", e);
            });
        }
    }, [debouncedProject, projectId]);

    // Actions
    const addTask = (task: Task) => {
        if (!project) return;
        isDirty.current = true;
        setProject(p => p ? { ...p, tasks: [...p.tasks, task] } : null);
    };

    const removeTask = (taskId: string) => {
        if (!project) return;
        isDirty.current = true;
        setProject(p => {
            if (!p) return null;
            const newTasks = p.tasks
                .filter(t => t.id !== taskId)
                .map(t => ({ ...t, dependencies: t.dependencies.filter(d => d !== taskId) }));
            const newAnchors = { ...p.anchors };
            delete newAnchors[taskId];
            return { ...p, tasks: newTasks, anchors: newAnchors };
        });
    };

    const editTask = (updatedTask: Task) => {
        if (!project) return;
        isDirty.current = true;
        setProject(p => p ? { ...p, tasks: p.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) } : null);
    };

    const toggleAnchor = (taskId: string) => {
        if (!project) return;
        isDirty.current = true;
        setProject(p => {
            if (!p) return null;
            const newAnchors = { ...p.anchors };
            if (newAnchors[taskId]) {
                delete newAnchors[taskId];
            } else {
                // Default to existing anchor date or today if none
                // If the task already has a computed end date, maybe use that?
                // For now, keep simple: use current global anchor or today
                let date = anchorDate;
                if (!date) {
                    date = new Date().toISOString().split('T')[0];
                }

                // If we have a computed schedule, we could try to anchor it where it currently is?
                // But simplified: just use the default
                newAnchors[taskId] = date;
            }
            return { ...p, anchors: newAnchors };
        });
    };

    // Update anchor date for a specific task
    const updateTaskAnchor = (taskId: string, newDate: string) => {
        if (project) {
            isDirty.current = true;
            setProject(p => {
                if (!p) return null;
                const newAnchors = { ...p.anchors };
                newAnchors[taskId] = newDate;
                return { ...p, anchors: newAnchors };
            });
            // Also update the UI helper state if this is the "main" one being edited?
            // For now, let's just update the local input state so the UI doesn't flicker
            setAnchorDate(newDate);
        }
    };

    // Derived state for UI
    const anchorTaskIds = project ? Object.keys(project.anchors) : [];

    return {
        project,
        scheduledTasks,
        loading,
        error,
        anchorDate,
        setAnchorDate,
        updateTaskAnchor,
        addTask,
        removeTask,
        editTask,
        toggleAnchor,
        anchorTaskIds
    };
}
