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

    // History stacks for Undo/Redo
    const historyRef = useRef<Project[]>([]);
    const futureRef = useRef<Project[]>([]);

    const updateProject = (newProject: Project) => {
        if (!project) return;

        // Push current state to history
        historyRef.current.push(project);

        // Clear future (redo) stack on new change
        futureRef.current = [];

        // Update state
        isDirty.current = true;
        setProject(newProject);
    };

    const undo = () => {
        const previous = historyRef.current.pop();
        if (previous && project) {
            futureRef.current.push(project);
            setProject(previous);
            isDirty.current = true;

            // Restore anchor date from the recovered project if needed?
            // Actually, we should probably sync anchorDate state if it drifts, 
            // but anchorDate is a UI helper mostly. 
            // Let's rely on the project anchors source of truth.
        }
    };

    const redo = () => {
        const next = futureRef.current.pop();
        if (next && project) {
            historyRef.current.push(project);
            setProject(next);
            isDirty.current = true;
        }
    };

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
    const calculateSchedule = useCallback(async (currentProject: Project) => {
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
            calculateSchedule(project);
        }
    }, [project, calculateSchedule]);

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
        const newProject = { ...project, tasks: [...project.tasks, task] };
        updateProject(newProject);
    };

    const removeTask = (taskId: string) => {
        if (!project) return;

        const newTasks = project.tasks
            .filter(t => t.id !== taskId)
            .map(t => ({ ...t, dependencies: t.dependencies.filter(d => d !== taskId) }));
        const newAnchors = { ...project.anchors };
        delete newAnchors[taskId];

        const newProject = { ...project, tasks: newTasks, anchors: newAnchors };
        updateProject(newProject);
    };

    const editTask = (updatedTask: Task) => {
        if (!project) return;
        const newProject = { ...project, tasks: project.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) };
        updateProject(newProject);
    };

    const toggleAnchor = (taskId: string) => {
        if (!project) return;

        const newAnchors = { ...project.anchors };
        if (newAnchors[taskId]) {
            delete newAnchors[taskId];
        } else {
            let date = anchorDate;
            if (!date) {
                date = new Date().toISOString().split('T')[0];
            }
            newAnchors[taskId] = date;
        }

        const newProject = { ...project, anchors: newAnchors };
        updateProject(newProject);
    };

    // Update anchor date for a specific task
    const updateTaskAnchor = (taskId: string, newDate: string) => {
        if (!project) return;

        const newAnchors = { ...project.anchors };
        newAnchors[taskId] = newDate;

        const newProject = { ...project, anchors: newAnchors };
        updateProject(newProject);

        setAnchorDate(newDate);
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
        undo,
        redo,
        anchorTaskIds
    };
}
