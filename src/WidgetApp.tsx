import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { differenceInDays, differenceInHours, parseISO } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, DiamondIcon } from "./components/icons";
import { MiniCalendar } from "./components/MiniCalendar";
import { CircularProgress } from "./components/CircularProgress";
import { useConfig } from "./hooks/useConfig";


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
    active_task: WidgetTask | null;
}

function WidgetApp() {
    const [info, setInfo] = useState<WidgetInfo | null>(null);
    const [liveProgress, setLiveProgress] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'focus' | 'list' | 'calendar'>('focus');
    const { theme, loaded: configLoaded } = useConfig();

    const fetchProject = async (projectId?: string) => {
        try {
            const args = projectId ? { projectId } : undefined;
            const data = await invoke<WidgetInfo | null>("get_widget_info", args);
            setInfo(data);
            // Initialize live progress immediately
            if (data?.active_task) {
                if (data.active_task.completed) {
                    setLiveProgress(1.0);
                } else {
                    setLiveProgress(data.task_progress);
                }
            } else {
                setLiveProgress(data?.task_progress ?? null);
            }
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



        // Auto-refresh every 10 minutes to ensure "days left" is accurate (e.g. crossing midnight)
        const intervalId = setInterval(fetchProject, 60000 * 10);

        return () => {
            unlistenPromise.then(unlisten => unlisten());
            window.removeEventListener("focus", handleFocus);
            clearInterval(intervalId);
        };
    }, []);

    // Apply theme
    useEffect(() => {
        if (!configLoaded) return;

        const root = document.documentElement;
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        root.classList.toggle('dark', isDark);

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e: MediaQueryListEvent) => {
                root.classList.toggle('dark', e.matches);
            };
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        }
    }, [theme, configLoaded]);

    // Live Progress Timer
    useEffect(() => {
        // If no active task or it's already completed, ensure we show 100% or stop
        if (!info?.active_task) return;

        if (info.active_task.completed) {
            setLiveProgress(1.0);
            return;
        }

        const updateProgress = () => {
            const now = new Date();
            const start = parseISO(info.active_task!.start_date);
            const end = parseISO(info.active_task!.end_date);

            const total = end.getTime() - start.getTime();
            const elapsed = now.getTime() - start.getTime();

            if (total <= 0) {
                setLiveProgress(1.0);
                return;
            }

            const p = Math.max(0, Math.min(1, elapsed / total));
            setLiveProgress(p);
        };

        // Update immediately
        updateProgress();

        // Update every minute as requested by user
        const interval = setInterval(updateProgress, 60000);
        return () => clearInterval(interval);
    }, [info?.active_task]);

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
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${activeTab === 'focus' ? 'bg-surface/30 shadow-sm text-text' : 'text-text-muted hover:text-text hover:scale-105'
                            }`}
                    >
                        Focus
                    </button>
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${activeTab === 'list' ? 'bg-surface/30 shadow-sm text-text' : 'text-text-muted hover:text-text hover:scale-105'
                            }`}
                    >
                        Up Next
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${activeTab === 'calendar' ? 'bg-surface/30 shadow-sm text-text' : 'text-text-muted hover:text-text hover:scale-105'
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
                        {/* Project Name */}
                        <div className="absolute top-2 w-full text-center px-4">
                            <div className="text-[10px] font-semibold text-text-muted/50 uppercase tracking-widest truncate">
                                {info.project_name}
                            </div>
                        </div>

                        {/* Circular Progress with Days Counter */}
                        <CircularProgress
                            progress={liveProgress || 0}
                            status={info.status}
                            size={130}
                            strokeWidth={5}
                        >
                            {/* Days/Hours number */}
                            <div className={`text-4xl font-bold tabular-nums ${info.task_progress === 1.0 ? 'text-success' : info.status === 'overdue' ? 'text-danger' : info.status === 'urgent' ? 'text-amber-500' : 'text-text'}`}>
                                {info.task_progress === 1.0 ? '✓' : (() => {
                                    if (!info.next_deadline) return '∞';
                                    const deadline = parseISO(info.next_deadline);
                                    const now = new Date();
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const days = differenceInDays(deadline, today);
                                    if (days < 0) return Math.abs(days);
                                    if (days === 0) {
                                        // Same day - show hours remaining
                                        const hours = Math.max(0, differenceInHours(deadline, now));
                                        return hours;
                                    }
                                    return days;
                                })()}
                            </div>
                            {/* Label */}
                            <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider -mt-1">
                                {info.task_progress === 1.0 ? 'DONE' : (() => {
                                    if (!info.next_deadline) return '';
                                    const deadline = parseISO(info.next_deadline);
                                    const now = new Date();
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const days = differenceInDays(deadline, today);
                                    if (days < 0) return 'OVERDUE';
                                    if (days === 0) {
                                        const hours = Math.max(0, differenceInHours(deadline, now));
                                        return hours === 1 ? 'HOUR LEFT' : 'HOURS LEFT';
                                    }
                                    if (days === 1) return 'DAY LEFT';
                                    return 'DAYS LEFT';
                                })()}
                            </div>
                        </CircularProgress>

                        {/* Current Task */}
                        {info.current_focus && (
                            <div className="mt-4 text-center max-w-[90%]">
                                <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">
                                    Current Focus
                                </div>
                                <div className="text-sm font-medium text-text/90 truncate">
                                    {info.current_focus}
                                </div>
                            </div>
                        )}
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
                                    <div key={task.id} className="relative mb-3 last:mb-0 pl-4 group stagger-item">
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
