import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { differenceInDays, parseISO } from "date-fns";

interface ProjectMetadata {
    id: string;
    name: string;
    next_deadline: string | null;
    status: string;
    current_focus: string | null;
}

function WidgetApp() {
    const [project, setProject] = useState<ProjectMetadata | null>(null);

    const fetchProject = async () => {
        try {
            const data = await invoke<ProjectMetadata | null>("get_next_deadline");
            setProject(data);
        } catch (error) {
            console.error("Failed to fetch project:", error);
        }
    };

    useEffect(() => {
        fetchProject();

        // Listen for updates from the main window
        const unlistenPromise = listen("project-update", () => {
            fetchProject();
        });

        // Refresh on window focus as a backup
        const handleFocus = () => fetchProject();
        window.addEventListener("focus", handleFocus);

        // Sync theme with main app
        const isDark = localStorage.getItem('anchor-theme') === 'dark' ||
            (!localStorage.getItem('anchor-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Auto-refresh every 10 minutes to ensure "days left" is accurate (e.g. crossing midnight)
        const intervalId = setInterval(fetchProject, 60000 * 10);

        return () => {
            unlistenPromise.then(unlisten => unlisten());
            window.removeEventListener("focus", handleFocus);
            clearInterval(intervalId);
        };
    }, []);

    const getDaysText = () => {
        if (!project || !project.next_deadline) return "No Deadline Set";

        try {
            // next_deadline from backend is YYYY-MM-DD string, parseISO handles it locally
            // But we might need to be careful if it's just a date string. 
            // The backend returns chrono::NaiveDate::to_string() which is YYYY-MM-DD.
            const deadline = parseISO(project.next_deadline);
            const today = new Date();
            // Reset time part for accurate day calculation
            today.setHours(0, 0, 0, 0);
            // ParseISO might interpret as UTC if not careful, but YYYY-MM-DD is usually local date
            // Let's coerce a simple string parse if needed, but date-fns parseISO is robust.

            const days = differenceInDays(deadline, today);

            if (days < 0) return `Overdue by ${Math.abs(days)} days`;
            if (days === 0) return "Due today";
            if (days === 1) return "Due tomorrow";
            return `Due in ${days} days`;
        } catch (e) {
            return "Invalid Date";
        }
    };

    const getStatusColor = () => {
        if (!project) return "from-gray-400 to-gray-500";
        switch (project.status) {
            case "overdue": return "from-red-500 to-red-600";
            case "urgent": return "from-amber-500 to-orange-500"; // Urgent means <= 5 days
            case "on_track": return "from-emerald-500 to-green-600";
            default: return "from-brand to-brand-hover";
        }
    };

    if (!project) {
        return (
            <div
                className="h-screen w-screen bg-surface/40 rounded-2xl border border-border/10 p-4 text-text overflow-hidden flex flex-col items-center justify-center select-none cursor-default relative transition-colors duration-300 backdrop-blur-md"
                data-tauri-drag-region
            >
                <div className="text-sm text-text-muted">No Active Projects</div>
            </div>
        );
    }

    return (
        <div
            className="h-screen w-screen bg-surface/40 rounded-2xl border border-border/10 p-4 text-text overflow-hidden flex flex-col items-center justify-center select-none cursor-default relative transition-colors duration-300 backdrop-blur-md"
            data-tauri-drag-region
        >
            <div className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1 pointer-events-none">
                Next Anchor
            </div>

            <div className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${getStatusColor()} pb-1 pointer-events-none text-center truncate w-full px-2`}>
                {project.name}
            </div>

            <div className="text-sm font-medium mt-1 text-text/80 pointer-events-none">
                {getDaysText()}
            </div>

            {project.current_focus && (
                <div className="text-xs text-text-muted mt-2 max-w-[90%] text-center truncate opacity-80 pointer-events-none">
                    Focus: {project.current_focus}
                </div>
            )}

            {/* Decorative timeline line */}
            <div className="w-full h-1 bg-border-muted mt-4 rounded-full overflow-hidden opacity-50 pointer-events-none">
                <div className={`h-full bg-gradient-to-r ${getStatusColor()} w-2/3 rounded-full`} />
            </div>
        </div>
    );
}

export default WidgetApp;
