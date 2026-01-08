import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TaskForm } from "./components/TaskForm";
import { Timeline } from "./components/Timeline";
import { CalendarView } from "./components/CalendarView";
import { DeadlineDisplay } from "./components/DeadlineDisplay";
import { ThemeToggle } from "./components/ThemeToggle";
import { MenuIcon, CloseIcon, TimelineIcon, CalendarIcon } from "./components/icons";
import { ScheduleRequest, ScheduledTask, Task } from "./types";
import "./App.css";

function App() {
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [anchors, setAnchors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const calculateSchedule = async (currentTasks: Task[], currentAnchors: Record<string, string>) => {
    try {
      const request: ScheduleRequest = { tasks: currentTasks, anchors: currentAnchors };
      const result = await invoke<ScheduledTask[]>("schedule", { request });
      setScheduledTasks(result);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(typeof e === 'string' ? e : "An unexpected error occurred");
    }
  }

  // App starts clean - no default tasks

  const handleScheduleInitial = async (request: ScheduleRequest) => {
    setTasks(request.tasks);
    setAnchors(request.anchors);
    await calculateSchedule(request.tasks, request.anchors);
  };

  const handleTaskMove = async (taskId: string, newDate: string) => {
    const newAnchors = { ...anchors, [taskId]: newDate };
    setAnchors(newAnchors);
    await calculateSchedule(tasks, newAnchors);
  };

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
          <TaskForm onSchedule={handleScheduleInitial} existingTasks={tasks} existingAnchors={anchors} />
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
