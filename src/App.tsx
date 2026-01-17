import { useState, useCallback, useEffect } from "react";
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

function App() {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const { theme, loaded: configLoaded } = useConfig();

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

  if (!activeProjectId) {
    return (
      <ProjectDashboard
        onOpenProject={setActiveProjectId}
      />
    );
  }

  if (loading && !project) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-alt">
        <div className="text-text-muted">Loading project...</div>
      </div>
    );
  }

  // Build anchors object for components that need it
  const anchors: Record<string, string> = {};
  anchorTaskIds.forEach(id => { anchors[id] = anchorDate; });

  const tasks = project?.tasks || [];

  return (
    <div className="app-shell">
      <TitleBar title={project?.name || "Anchor"} />
      <div className="app-layout">
        {/* Sidebar */}
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
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
        </aside>

        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="app-main">
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

              {/* ThemeToggle removed - using system settings */}
              {/* <ThemeToggle theme={theme as Theme} onThemeChange={(t) => setTheme(t)} /> */}
            </div>
          </header>

          {error && (
            <div className="mx-6 mt-4 bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg" role="alert">
              <strong className="font-semibold">Error: </strong>
              <span>{error}</span>
            </div>
          )}

          <div className="main-content">
            {viewMode === 'timeline' ? (
              <Timeline
                tasks={scheduledTasks}
                definitions={tasks}
                onOpenDetails={handleOpenDetails}
              />
            ) : viewMode === 'calendar' ? (
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
            ) : (
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
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
