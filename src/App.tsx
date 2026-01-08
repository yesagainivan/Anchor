import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TaskForm } from "./components/TaskForm";
import { Timeline } from "./components/Timeline";
import { CalendarView } from "./components/CalendarView";
import { DeadlineDisplay } from "./components/DeadlineDisplay";
import { ThemeToggle } from "./components/ThemeToggle";
import { MenuIcon, CloseIcon, TimelineIcon, CalendarIcon } from "./components/icons";
import { ScheduledTask, Task } from "./types";
import "./App.css";

function App() {
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [anchorTaskIds, setAnchorTaskIds] = useState<string[]>([]);
  const [anchorDate, setAnchorDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const calculateSchedule = useCallback(async (currentTasks: Task[], currentAnchorIds: string[], currentAnchorDate: string) => {
    if (currentTasks.length === 0 || currentAnchorIds.length === 0 || !currentAnchorDate) {
      setScheduledTasks([]);
      return;
    }
    try {
      const anchors: Record<string, string> = {};
      currentAnchorIds.forEach(id => { anchors[id] = currentAnchorDate; });
      const result = await invoke<ScheduledTask[]>("schedule", { request: { tasks: currentTasks, anchors } });
      setScheduledTasks(result);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(typeof e === 'string' ? e : "An unexpected error occurred");
    }
  }, []);

  // Handlers passed to TaskForm
  const handleAddTask = useCallback((task: Task) => {
    const newTasks = [...tasks, task];
    setTasks(newTasks);
    calculateSchedule(newTasks, anchorTaskIds, anchorDate);
  }, [tasks, anchorTaskIds, anchorDate, calculateSchedule]);

  const handleRemoveTask = useCallback((taskId: string) => {
    const newTasks = tasks
      .filter(t => t.id !== taskId)
      .map(t => ({ ...t, dependencies: t.dependencies.filter(d => d !== taskId) }));
    const newAnchorIds = anchorTaskIds.filter(id => id !== taskId);
    setTasks(newTasks);
    setAnchorTaskIds(newAnchorIds);
    calculateSchedule(newTasks, newAnchorIds, anchorDate);
  }, [tasks, anchorTaskIds, anchorDate, calculateSchedule]);

  const handleToggleAnchor = useCallback((taskId: string) => {
    const newAnchorIds = anchorTaskIds.includes(taskId)
      ? anchorTaskIds.filter(id => id !== taskId)
      : [...anchorTaskIds, taskId];
    setAnchorTaskIds(newAnchorIds);

    // If we're adding an anchor and no date is set, default to today
    let effectiveDate = anchorDate;
    if (newAnchorIds.length > 0 && !anchorDate) {
      effectiveDate = new Date().toISOString().split('T')[0];
      setAnchorDate(effectiveDate);
    }

    calculateSchedule(tasks, newAnchorIds, effectiveDate);
  }, [tasks, anchorTaskIds, anchorDate, calculateSchedule]);

  const handleEditTask = useCallback((updatedTask: Task) => {
    const newTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    setTasks(newTasks);
    // calculate schedule only needs updated tasks list
    calculateSchedule(newTasks, anchorTaskIds, anchorDate);
  }, [tasks, anchorTaskIds, anchorDate, calculateSchedule]);

  const handleAnchorDateChange = useCallback((date: string) => {
    setAnchorDate(date);
    calculateSchedule(tasks, anchorTaskIds, date);
  }, [tasks, anchorTaskIds, calculateSchedule]);

  const handleTaskMove = useCallback(async (taskId: string, newDate: string) => {
    // When moving a task, anchor it to the new date
    const newAnchorIds = anchorTaskIds.includes(taskId) ? anchorTaskIds : [...anchorTaskIds, taskId];
    setAnchorTaskIds(newAnchorIds);
    setAnchorDate(newDate);
    calculateSchedule(tasks, newAnchorIds, newDate);
  }, [tasks, anchorTaskIds, calculateSchedule]);

  // Build anchors object for components that need it
  const anchors: Record<string, string> = {};
  anchorTaskIds.forEach(id => { anchors[id] = anchorDate; });

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h1 className="text-xl font-bold text-text tracking-tight">
            Anchor<span className="text-brand">.</span>
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-surface-alt text-text-muted"
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
            onAddTask={handleAddTask}
            onRemoveTask={handleRemoveTask}
            onToggleAnchor={handleToggleAnchor}
            onAnchorDateChange={handleAnchorDateChange}
            onEditTask={handleEditTask}
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
            <ThemeToggle />
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
