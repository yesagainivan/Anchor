import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, Variants } from "framer-motion";
import { ProjectMetadata } from "../types";
import { getStatusBgColor } from "../utils/status";
// ThemeToggle removed - using system settings
// import { ThemeToggle, Theme } from "./ThemeToggle";

import { ConfirmationModal } from "./ConfirmationModal";

interface ProjectDashboardProps {
    onOpenProject: (id: string) => void;
    projects: ProjectMetadata[];
    loading: boolean;
    onProjectChange: () => void;
}

export function ProjectDashboard({ onOpenProject, projects, loading, onProjectChange }: ProjectDashboardProps) {
    const [creating, setCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        setCreating(true);
        try {
            const project = await invoke<{ id: string }>("create_project", { name: newProjectName });
            setNewProjectName("");
            onOpenProject(project.id);
        } catch (e) {
            console.error(e);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setProjectToDelete(id);
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;

        try {
            await invoke("delete_project", { id: projectToDelete });
            onProjectChange();
        } catch (e) {
            console.error(e);
        }
    };

    const gridVariants: Variants = {
        initial: { opacity: 0 },
        animate: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.05
            }
        }
    };

    const cardVariants: Variants = {
        initial: { opacity: 0, y: 20 },
        animate: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 24
            }
        },
        hover: {
            scale: 1.02,
            borderColor: "var(--color-brand)",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            transition: { duration: 0.2 }
        }
    };

    return (
        <div className="dashboard-content">
            <div className="max-w-5xl mx-auto w-full">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-text mb-2">My Goals</h1>
                        <p className="text-text-muted">Manage your projects and plans.</p>
                    </div>
                    {/* ThemeToggle removed - using system settings */}
                </header>

                <motion.div
                    variants={gridVariants}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {/* Create New Card */}
                    <motion.div
                        variants={cardVariants}
                        whileHover="hover"
                        style={{
                            backfaceVisibility: 'hidden',
                            WebkitFontSmoothing: 'subpixel-antialiased',
                            transform: 'translateZ(0)'
                        } as any}
                        className="bg-surface/50 p-6 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center min-h-[200px]"
                    >
                        <form onSubmit={handleCreate} className="w-full text-center">
                            <h3 className="text-lg font-medium text-text mb-4">Start a New Goal</h3>
                            <input
                                type="text"
                                placeholder="Goal Name (e.g. Launch Marketing)"
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-surface-alt/30 border border-border focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all mb-4 text-center"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={creating || !newProjectName.trim()}
                                className="px-6 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creating ? "Creating..." : "Create Goal"}
                            </button>
                        </form>
                    </motion.div>

                    {/* Project Cards */}
                    {projects.map(project => (
                        <motion.div
                            key={project.id}
                            variants={cardVariants}
                            whileHover="hover"
                            onClick={() => onOpenProject(project.id)}
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitFontSmoothing: 'subpixel-antialiased',
                                transform: 'translateZ(0)'
                            } as any}
                            className="bg-surface/50 p-6 rounded-xl border border-border cursor-pointer group relative flex flex-col justify-between min-h-[160px]"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2 pr-8">
                                        <h3 className="text-xl font-bold text-text truncate">{project.name}</h3>
                                        {project.status !== 'empty' && (
                                            <div
                                                className={`w-2.5 h-2.5 rounded-full ring-2 ring-surface ${getStatusBgColor(project.status)}`}
                                                title={project.status.replace('_', ' ')}
                                            />
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, project.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all absolute top-4 right-4"
                                        title="Delete Project"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>

                                {project.current_focus ? (
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Current Focus</p>
                                        <p className="text-text font-medium truncate">{project.current_focus}</p>
                                    </div>
                                ) : (
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Next Step</p>
                                        <p className="text-text-faint italic">No tasks scheduled</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-end text-sm pt-4 border-t border-border mt-auto">
                                <div>
                                    {project.next_deadline && (
                                        <div className="flex flex-col">
                                            <span className="text-text-muted text-xs">Next Deadline</span>
                                            <span className={`font-medium ${project.status === 'urgent' || project.status === 'overdue' ? 'text-danger' : 'text-text'}`}>
                                                {new Date(project.next_deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className="text-text-muted text-xs block">Tasks</span>
                                    <span className="font-medium text-text block">{project.task_count}</span>
                                    <span className="text-[10px] text-text-faint block mt-1">
                                        Edited {getRelativeTime(project.last_modified)}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {!loading && projects.length === 0 && (
                        <div className="col-span-full text-center py-12 text-text-muted">
                            <p>No goals yet. Create one to get started!</p>
                        </div>
                    )}
                </motion.div>
            </div>

            <ConfirmationModal
                isOpen={!!projectToDelete}
                onClose={() => setProjectToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete Project"
                message="Are you sure you want to delete this project? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div >
    );
}

function getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 172800) return "yesterday";

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
