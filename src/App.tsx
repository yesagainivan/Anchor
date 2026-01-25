import { useState, useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { TaskForm } from "./components/TaskForm";
import { Timeline } from "./components/Timeline";
import { CalendarView, CalendarViewType } from "./components/CalendarView";
import { DeadlineDisplay } from "./components/DeadlineDisplay";
// ThemeToggle removed - using system settings
// import { ThemeToggle, Theme } from "./components/ThemeToggle";
import { ProjectDashboard } from "./components/ProjectDashboard";
import { MenuIcon, CloseIcon, TimelineIcon, CalendarIcon, BackIcon, MemoIcon } from "./components/icons";
import { TitleBar } from "./components/TitleBar";
import { useProject } from "./hooks/useProject";
import { useConfig } from "./hooks/useConfig";
import "./App.css";


import { useNotificationScheduler } from './hooks/useNotificationScheduler';

import { TaskDetailsView } from "./components/TaskDetailsView";
import { useProjectsList } from "./hooks/useProjectsList";
import { AnimatePresence, motion, Variants } from "framer-motion";

// Helper for page transitions
// Orchestration: Parent handles exit, but children handle entrance
const pageVariants: Variants = {
  initial: { opacity: 1 },
  animate: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

const dashboardVariants: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 }, // Immediate entrance for container
  exit: {
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const contentVariants: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

const tabVariants: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    scale: 1,
    transition: { duration: 0.1 }
  }
};

function App() {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const { theme, loaded: configLoaded } = useConfig();
  const { projects: projectList, loading: loadingList, refreshProjects } = useProjectsList();

  const {
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
    updateTaskAnchor,
    undo,
    redo,
    anchorTaskIds
  } = useProject(activeProjectId);

  // Initialize notification scheduler
  useNotificationScheduler(scheduledTasks);

  const [viewMode, setViewMode] = useState<'timeline' | 'calendar' | 'details'>('timeline');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [startInEditMode, setStartInEditMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Deep Link Handling
  const [pendingDeepLink, setPendingDeepLink] = useState<{ taskId: string } | null>(null);

  // Handle pending deep link once project data is loaded
  useEffect(() => {
    if (!pendingDeepLink || !project || loading) return;

    // Check if task exists in current project
    const taskExists = project.tasks.some(t => t.id === pendingDeepLink.taskId);

    if (taskExists) {
      setSelectedTaskId(pendingDeepLink.taskId);
      setViewMode('details');
      setStartInEditMode(false);
      setPendingDeepLink(null); // Clear pending state
    }
  }, [project, loading, pendingDeepLink]);

  // Calendar State
  const [calendarView, setCalendarView] = useState<CalendarViewType>('month');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Apply theme to DOM
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

  // Global Undo/Redo shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          // Redo
          e.preventDefault();
          redo();
        } else {
          // Undo
          e.preventDefault();
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Listen for open-task-details event from widget
  useEffect(() => {
    const unlisten = listen<{ taskId: string; projectId?: string }>('open-task-details', async (event) => {
      const { taskId, projectId } = event.payload;

      // Ensure window is visible using Rust command for reliability
      try {
        await invoke('show_main_window');
      } catch (e) {
        console.error("Failed to show window via Rust:", e);
      }

      // Handle Project Switching
      if (projectId && projectId !== activeProjectId) {
        setActiveProjectId(projectId);
        setPendingDeepLink({ taskId }); // Queue navigation for after load
        return;
      }

      // If already on standard project or no project specified
      setSelectedTaskId(taskId);
      setViewMode('details');
      setStartInEditMode(false);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, [activeProjectId]); // Re-bind if activeProjectId changes

  const handleTaskMove = useCallback(async (taskId: string, newDate: string) => {
    // When moving a task, we now anchor JUST that task to the new date
    updateTaskAnchor(taskId, newDate);

    // Ensure the task is marked as an anchor if it wasn't already
    if (!anchorTaskIds.includes(taskId)) {
      toggleAnchor(taskId);
    }
  }, [toggleAnchor, updateTaskAnchor, anchorTaskIds]);

  const handleTaskDurationChange = useCallback((taskId: string, newDurationMinutes: number) => {
    const currentTasks = project?.tasks || [];
    const task = currentTasks.find(t => t.id === taskId);
    if (!task) return;

    // Create updated task with new duration
    // If we're resizing in calendar, we likely want to switch to minute precision
    // even if it was originally days (since resizing implies fine-tuning)
    const updatedTask = {
      ...task,
      duration_minutes: newDurationMinutes,
      duration_days: 0 // Clear days to ensure minutes are used
    };

    editTask(updatedTask);
  }, [project, editTask]);

  const handleOpenDetails = (taskId: string, editMode: boolean = false) => {
    setSelectedTaskId(taskId);
    setStartInEditMode(editMode);
    setViewMode('details');
    // Auto-close sidebar on smaller screens (when it's an overlay)
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  if (!configLoaded) {
    return null; // Or a loading spinner
  }

  if (loading && !project && activeProjectId) { // Only show loading for project, not dashboard
    return (
      <div className="flex items-center justify-center h-screen bg-surface-alt">
        <div className="text-text-muted">Loading project...</div>
      </div>
    );
  }

  // Build anchors object from project data
  const anchors: Record<string, string> = project?.anchors || {};

  const tasks = project?.tasks || [];
  const currentTitle = activeProjectId ? (project?.name || "Anchor") : "Anchor";

  return (
    <div className="app-shell">
      <TitleBar title={currentTitle} />
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!activeProjectId ? (
            <motion.div
              key="dashboard"
              variants={dashboardVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full"
            >
              <ProjectDashboard
                onOpenProject={setActiveProjectId}
                projects={projectList}
                loading={loadingList}
                onProjectChange={refreshProjects}
              />
            </motion.div>
          ) : (
            <motion.div
              key="project-view"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full flex flex-col"
            >
              <div className="app-layout">
                {/* Sidebar */}
                <motion.aside variants={contentVariants} className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                  <div className="sidebar-header">
                    <button
                      onClick={() => setActiveProjectId(null)}
                      className="p-1.5 -ml-2 mr-2 rounded-lg hover:bg-surface-alt text-text-muted"
                      title="Back to Dashboard"
                    >
                      <BackIcon />
                    </button>
                    <h1 className="text-xl font-bold text-text tracking-tight truncate flex-1">
                      {project?.name || "Anchor"}
                    </h1>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-surface-alt text-text-muted transition-colors"
                      title="Close Sidebar"
                    >
                      <CloseIcon />
                    </button>
                  </div>

                  <div className="sidebar-content">
                    <DeadlineDisplay anchors={anchors} />
                    <TaskForm
                      tasks={tasks}
                      anchorTaskIds={anchorTaskIds}
                      anchorDate={anchorDate}
                      onAddTask={addTask}
                      onRemoveTask={removeTask}
                      onToggleAnchor={toggleAnchor}
                      onAnchorDateChange={setAnchorDate}
                      onEditTask={editTask}
                      onOpenDetails={handleOpenDetails}
                    />
                  </div>
                </motion.aside>

                {/* Sidebar overlay for mobile */}
                {sidebarOpen && (
                  <div
                    className="sidebar-overlay md:hidden"
                    onClick={() => setSidebarOpen(false)}
                  />
                )}

                {/* Main Content */}
                <motion.main variants={contentVariants} className="app-main">
                  {/* Top bar */}
                  <header className="main-header">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSidebarOpen(true)}
                        className={`p-2 rounded-lg hover:bg-surface-alt text-text-muted ${sidebarOpen ? 'md:hidden' : ''}`}
                      >
                        <MenuIcon />
                      </button>
                      <h2 className="text-lg font-semibold text-text">
                        {viewMode === 'timeline' ? 'Timeline' : viewMode === 'calendar' ? 'Calendar' : 'Task Details'}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="bg-surface/20 rounded-lg p-1 flex gap-1">
                        <button
                          onClick={() => setViewMode('timeline')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'timeline'
                            ? 'bg-surface text-text shadow-sm'
                            : 'text-text-muted hover:text-text'
                            }`}
                          title="Timeline View"
                        >
                          <TimelineIcon />
                        </button>
                        <button
                          onClick={() => setViewMode('calendar')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'calendar'
                            ? 'bg-surface text-text shadow-sm'
                            : 'text-text-muted hover:text-text'
                            }`}
                          title="Calendar View"
                        >
                          <CalendarIcon />
                        </button>
                        <button
                          onClick={() => setViewMode('details')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${viewMode === 'details'
                            ? 'bg-surface text-text shadow-sm'
                            : 'text-text-muted hover:text-text'
                            }`}
                          title="Task Details"
                        >
                          <MemoIcon className="w-4 h-4" />
                          {/* <span className="hidden sm:inline">Details</span> */}
                        </button>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
                            const widget = await WebviewWindow.getByLabel('widget');
                            if (widget) {
                              widget.setFocus();
                            } else {
                              new WebviewWindow('widget', {
                                url: 'widget.html',
                                transparent: true,
                                decorations: false,
                                skipTaskbar: true,
                                resizable: false,
                                width: 300,
                                height: 300
                              });
                            }
                          } catch (e) {
                            console.error('Failed to launch widget:', e);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-surface-alt text-text-muted text-xs uppercase font-bold tracking-wider"
                        title="Launch Widget"
                      >
                        WIDGET
                      </button>
                    </div>
                  </header>

                  {error && (
                    <div className="mx-6 mt-4 bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg" role="alert">
                      <strong className="font-semibold">Error: </strong>
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="main-content relative overflow-hidden">
                    <AnimatePresence mode="wait">
                      {viewMode === 'timeline' ? (
                        <motion.div
                          key="timeline"
                          variants={tabVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          className="h-full flex flex-col"
                        >
                          <Timeline
                            tasks={scheduledTasks}
                            definitions={tasks}
                            onOpenDetails={handleOpenDetails}
                          />
                        </motion.div>
                      ) : viewMode === 'calendar' ? (
                        <motion.div
                          key="calendar"
                          variants={tabVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          className="h-full flex flex-col"
                        >
                          <CalendarView
                            tasks={scheduledTasks}
                            definitions={tasks}
                            onTaskMove={handleTaskMove}
                            onTaskDurationChange={handleTaskDurationChange}
                            view={calendarView}
                            date={calendarDate}
                            onViewChange={setCalendarView}
                            onNavigate={setCalendarDate}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="details"
                          variants={tabVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          className="h-full flex flex-col"
                        >
                          <TaskDetailsView
                            key={selectedTaskId} // Reset component state when switching tasks
                            taskId={selectedTaskId}
                            initialEditMode={startInEditMode}
                            tasks={tasks}
                            schedule={scheduledTasks}
                            onUpdateTask={editTask}
                            onDeleteTask={(id) => {
                              removeTask(id);
                              setSelectedTaskId(null);
                            }}
                            onClose={() => setViewMode('timeline')}
                            taskAnchorDate={selectedTaskId ? anchors[selectedTaskId] : undefined}
                            onUpdateAnchor={updateTaskAnchor}
                            onToggleAnchor={toggleAnchor}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.main>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
