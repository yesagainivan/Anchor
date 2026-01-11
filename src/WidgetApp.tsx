import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { differenceInDays, parseISO } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, DiamondIcon } from "./components/icons";
import { MiniCalendar } from "./components/MiniCalendar";


interface WidgetTask {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    completed: boolean;
    is_milestone?: boolean;
    status: 'active' | 'future' | 'overdue';
}

interface ProjectSummary {
    id: string;
    name: string;
}

interface WidgetInfo {
    project_id: string;
    project_name: string;
    next_deadline: string | null;
    status: string;
    current_focus: string | null;
    upcoming_tasks: WidgetTask[];
    calendar_tasks: WidgetTask[];
    all_projects: ProjectSummary[];
    task_progress: number | null;
}

function WidgetApp() {
    const [info, setInfo] = useState<WidgetInfo | null>(null);
    const [activeTab, setActiveTab] = useState<'focus' | 'list' | 'calendar'>('focus');

    const fetchProject = async (projectId?: string) => {
        try {
            const args = projectId ? { projectId } : undefined;
            const data = await invoke<WidgetInfo | null>("get_widget_info", args);
            setInfo(data);
        } catch (error) {
            console.error("Failed to fetch widget info:", error);
        }
    };

    const handleNextProject = () => {
        if (!info || info.all_projects.length <= 1) return;
        const currentIndex = info.all_projects.findIndex(p => p.id === info.project_id);
        const nextIndex = (currentIndex + 1) % info.all_projects.length;
        fetchProject(info.all_projects[nextIndex].id);
    };

    const handlePrevProject = () => {
        if (!info || info.all_projects.length <= 1) return;
        const currentIndex = info.all_projects.findIndex(p => p.id === info.project_id);
        const prevIndex = (currentIndex - 1 + info.all_projects.length) % info.all_projects.length;
        fetchProject(info.all_projects[prevIndex].id);
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
        if (!info || !info.next_deadline) return "No Deadline Set";

        try {
            // next_deadline from backend is YYYY-MM-DD string, parseISO handles it locally
            // But we might need to be careful if it's just a date string. 
            // The backend returns chrono::NaiveDate::to_string() which is YYYY-MM-DD.
            const deadline = parseISO(info.next_deadline);
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
        if (!info) return "from-gray-400 to-gray-500";
        switch (info.status) {
            case "overdue": return "from-red-500 to-red-600";
            case "urgent": return "from-amber-500 to-orange-500"; // Urgent means <= 5 days
            case "on_track": return "from-[var(--color-success)] to-[var(--color-success)]";
            default: return "from-brand to-brand-hover";
        }
    };

    if (!info) {
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
            className="h-screen w-screen bg-surface/40 rounded-2xl border border-border/10 overflow-hidden flex flex-col select-none cursor-default relative transition-colors duration-300 backdrop-blur-md"
        >
            {/* Header / Tabs */}
            <div data-tauri-drag-region className="flex items-center justify-between px-4 py-2 bg-surface-alt/20 border-b border-border/5 cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-1">
                    {info.all_projects.length > 1 ? (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePrevProject(); }}
                                className="p-1 hover:text-text transition-colors rounded hover:bg-surface-alt/80 text-text-muted"
                                title="Previous Project"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNextProject(); }}
                                className="p-1 hover:text-text transition-colors rounded hover:bg-surface-alt/80 text-text-muted"
                                title="Next Project"
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </>
                    ) : null}
                </div>
                <div className="flex gap-1 bg-surface-alt/20 rounded-lg p-0.5">
                    <button
                        onClick={() => setActiveTab('focus')}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${activeTab === 'focus' ? 'bg-surface/30 shadow-sm text-text' : 'text-text-muted hover:text-text'
                            }`}
                    >
                        Focus
                    </button>
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${activeTab === 'list' ? 'bg-surface/30 shadow-sm text-text' : 'text-text-muted hover:text-text'
                            }`}
                    >
                        Up Next
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${activeTab === 'calendar' ? 'bg-surface/30 shadow-sm text-text' : 'text-text-muted hover:text-text'
                            }`}
                    >
                        Month
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col relative">
                {activeTab === 'focus' ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
                        {/* Project Name (Absolute or subtle overlay) */}
                        <div className="absolute top-2 w-full text-center px-4">
                            <div className="text-[10px] font-semibold text-text-muted/50 uppercase tracking-widest truncate">
                                {info.project_name}
                            </div>
                        </div>

                        {/* Label: Changes if completed */}
                        <div className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1 pointer-events-none mt-2">
                            {info.task_progress === 1.0 ? "Current Task" : "Next Task"}
                        </div>

                        {/* Status Text */}
                        <div className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${info.task_progress === 1.0 ? "from-[var(--color-success)] to-[var(--color-success)]" : getStatusColor()} pb-1 pointer-events-none text-center truncate w-full px-2`}>
                            {info.task_progress === 1.0 ? "Completed" : getDaysText()}
                        </div>

                        {info.current_focus && (
                            <div className="text-sm font-medium text-text/90 mt-2 max-w-[90%] text-center truncate pointer-events-none">
                                {info.current_focus}
                            </div>
                        )}

                        {/* Progress Bar */}
                        <div className="w-full h-1 bg-border-muted mt-6 rounded-full overflow-hidden opacity-50 pointer-events-none relative">
                            <div
                                className={`h-full bg-gradient-to-r ${info.task_progress === 1.0 ? "from-[var(--color-success)] to-[var(--color-success)]" : getStatusColor()} rounded-full transition-all duration-500 ease-out`}
                                style={{ width: `${Math.round((info.task_progress || 0) * 100)}%` }}
                            />
                        </div>
                    </div>
                ) : activeTab === 'list' ? (
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 pretty-scrollbar">
                        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2 pl-1 truncate">
                            {info.project_name}
                        </div>
                        {info.upcoming_tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-text-muted text-xs italic pb-4">
                                No upcoming tasks
                            </div>
                        ) : (
                            <div className="relative pl-3">
                                {/* Vertical Line */}
                                <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-border-muted" />

                                {info.upcoming_tasks.map((task) => (
                                    <div key={task.id} className="relative mb-3 last:mb-0 pl-4 group">
                                        {/* Dot */}
                                        <div className={`absolute left-[-1px] top-1.5 w-3 h-3 rounded-full border-2 transition-colors flex items-center justify-center ${task.completed
                                            ? 'bg-success border-success'
                                            : task.is_milestone
                                                ? 'bg-purple-500 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                                                : task.status === 'active'
                                                    ? 'bg-brand border-brand shadow-[0_0_8px_rgba(var(--brand-rgb),0.5)]'
                                                    : task.status === 'overdue'
                                                        ? 'bg-danger border-danger'
                                                        : 'bg-surface border-text-muted group-hover:border-text-faint'
                                            }`}>
                                            {task.is_milestone && !task.completed && <DiamondIcon className="w-1.5 h-1.5 text-white" />}
                                        </div>

                                        <div className="flex flex-col">
                                            <span className={`text-xs font-medium truncate ${task.status === 'active' ? 'text-text' : 'text-text-muted'
                                                }`}>
                                                {task.name}
                                            </span>
                                            <span className="text-[10px] text-text-faint">
                                                {(() => {
                                                    const start = parseISO(task.start_date);
                                                    const end = parseISO(task.end_date);
                                                    const now = new Date();
                                                    now.setHours(0, 0, 0, 0); // Normalize to midnight for accurate day diff

                                                    const daysToStart = differenceInDays(start, now);
                                                    const daysWhenEnd = differenceInDays(end, now);

                                                    if (task.status === 'overdue') return `Overdue (${Math.abs(daysWhenEnd)} days)`;
                                                    if (task.status === 'active') {
                                                        if (daysWhenEnd === 0) return 'Due today';
                                                        if (daysWhenEnd === 1) return 'Due tomorrow';
                                                        return `Due in ${Math.abs(daysWhenEnd)} days`;
                                                    }

                                                    // Future tasks
                                                    if (daysToStart === 0) return 'Starts today';
                                                    if (daysToStart === 1) return 'Starts tomorrow';
                                                    return `Starts in ${daysToStart} days`;
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <MiniCalendar tasks={info.calendar_tasks} />
                )}
            </div>
        </div>
    );
}


export default WidgetApp;
