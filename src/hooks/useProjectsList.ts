import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ProjectMetadata } from "../types";

export function useProjectsList() {
    const [projects, setProjects] = useState<ProjectMetadata[]>([]);
    const [loading, setLoading] = useState(true);

    const loadProjects = useCallback(async () => {
        try {
            // setLoading(true); // Don't set loading true on refresh to avoid flashing
            const list = await invoke<ProjectMetadata[]>("list_projects");
            setProjects(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProjects();

        // Listen for updates (creation, deletion, etc.)
        const unlisten = listen("project-update", () => {
            loadProjects();
        });

        return () => {
            unlisten.then(f => f());
        };
    }, [loadProjects]);

    return { projects, loading, refreshProjects: loadProjects };
}
