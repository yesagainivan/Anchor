import { useState, useCallback, useEffect } from "react";
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
        if (currentProject.tasks.length === 0 || anchorIds.length === 0 || !currentAnchorDate) {
            setScheduledTasks([]);
            return;
        }

        try {
            // Ensure all anchors use the current effective date (simplification for now: global anchor date)
            // In a more complex version, we might support different dates per anchor.
            // But based on current App.tsx logic, they all share `anchorDate`.
            const effectiveAnchors: Record<string, string> = {};
            anchorIds.forEach(id => effectiveAnchors[id] = currentAnchorDate);

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
        if (debouncedProject && projectId) {
            invoke("save_project", { project: debouncedProject }).catch(e => {
                console.error("Auto-save failed:", e);
                // Don't show user visible error for background save unless critical?
            });
        }
    }, [debouncedProject, projectId]);

    // Actions
    const addTask = (task: Task) => {
        if (!project) return;
        setProject(p => p ? { ...p, tasks: [...p.tasks, task] } : null);
    };

    const removeTask = (taskId: string) => {
        if (!project) return;
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
        setProject(p => p ? { ...p, tasks: p.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) } : null);
    };

    const toggleAnchor = (taskId: string) => {
        if (!project) return;
        setProject(p => {
            if (!p) return null;
            const newAnchors = { ...p.anchors };
            if (newAnchors[taskId]) {
                delete newAnchors[taskId];
            } else {
                // If adding first anchor, use today if date not set
                let date = anchorDate;
                if (!date) {
                    date = new Date().toISOString().split('T')[0];
                    setAnchorDate(date);
                }
                newAnchors[taskId] = date;
            }
            return { ...p, anchors: newAnchors };
        });
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
        addTask,
        removeTask,
        editTask,
        toggleAnchor,
        anchorTaskIds
    };
}
