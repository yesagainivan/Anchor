import { useState, useCallback, useEffect } from "react";
import { TaskForm } from "./components/TaskForm";
import { Timeline } from "./components/Timeline";
import { CalendarView } from "./components/CalendarView";
import { DeadlineDisplay } from "./components/DeadlineDisplay";
import { ThemeToggle, Theme } from "./components/ThemeToggle";
import { ProjectDashboard } from "./components/ProjectDashboard";
import { MenuIcon, CloseIcon, TimelineIcon, CalendarIcon, BackIcon } from "./components/icons";
import { useProject } from "./hooks/useProject";
import { useConfig } from "./hooks/useConfig";
import "./App.css";

function App() {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const { theme, setTheme, loaded: configLoaded } = useConfig();

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
    anchorTaskIds
  } = useProject(activeProjectId);

  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const handleTaskMove = useCallback(async (taskId: string, newDate: string) => {
    // When moving a task, anchor it to the new date
    setAnchorDate(newDate);
    // And ensure the task is anchored
    if (!anchorTaskIds.includes(taskId)) {
      toggleAnchor(taskId);
    }
  }, [toggleAnchor, anchorTaskIds, setAnchorDate]);

  if (!configLoaded) {
    return null; // Or a loading spinner
  }

  if (!activeProjectId) {
    return (
      <ProjectDashboard
        onOpenProject={setActiveProjectId}
        theme={theme as Theme}
        onThemeChange={(t) => setTheme(t)}
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
          />
        </div>
      </aside>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay lg:hidden"
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
              className={`p-2 rounded-lg hover:bg-surface-alt text-text-muted ${sidebarOpen ? 'lg:hidden' : ''}`}
            >
              <MenuIcon />
            </button>
            <h2 className="text-lg font-semibold text-text">
              {viewMode === 'timeline' ? 'Timeline' : 'Calendar'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-surface-alt rounded-lg p-1 flex gap-1">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'timeline'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
                  }`}
              >
                <TimelineIcon />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'calendar'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
                  }`}
              >
                <CalendarIcon />
              </button>
            </div>
            <ThemeToggle theme={theme as Theme} onThemeChange={(t) => setTheme(t)} />
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
            <Timeline tasks={scheduledTasks} definitions={tasks} />
          ) : (
            <CalendarView tasks={scheduledTasks} onTaskMove={handleTaskMove} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
