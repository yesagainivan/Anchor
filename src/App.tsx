import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TaskForm } from "./components/TaskForm";
import { Timeline } from "./components/Timeline";
import { CalendarView } from "./components/CalendarView";
import { DeadlineDisplay } from "./components/DeadlineDisplay";
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

  useEffect(() => {
    const defaultTasks: Task[] = [
      { id: "1", name: "Product Launch", duration_days: 1, dependencies: ["2"] },
      { id: "2", name: "Final QA", duration_days: 3, dependencies: ["3"] },
      { id: "3", name: "Development", duration_days: 10, dependencies: ["4", "5"] },
      { id: "4", name: "Design", duration_days: 5, dependencies: [] },
      { id: "5", name: "Backend Setup", duration_days: 7, dependencies: [] },
      { id: "6", name: "Marketing Campaign", duration_days: 5, dependencies: ["7"] },
      { id: "7", name: "Create Ad Assets", duration_days: 3, dependencies: [] },
    ];

    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);
    const dateStr = nextMonth.toISOString().split('T')[0];

    const defaultAnchors = { "1": dateStr, "6": dateStr };
    handleScheduleInitial({ tasks: defaultTasks, anchors: defaultAnchors });
  }, []);

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
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Anchor<span className="text-blue-600">.</span>
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
              className={`p-2 rounded-lg hover:bg-gray-100 text-gray-500 ${sidebarOpen ? 'lg:hidden' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {viewMode === 'timeline' ? 'Timeline' : 'Calendar'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'timeline'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg" role="alert">
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
