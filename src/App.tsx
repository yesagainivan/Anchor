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

  const calculateSchedule = async (currentTasks: Task[], currentAnchors: Record<string, string>) => {
    try {
      const request: ScheduleRequest = { tasks: currentTasks, anchors: currentAnchors };
      const result = await invoke<ScheduledTask[]>("calculate_backwards_schedule", { request });
      setScheduledTasks(result);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(typeof e === 'string' ? e : "An unexpected error occurred");
    }
  }

  // DEFAULT DATA FOR DEMO PURPOSES
  useEffect(() => {
    const defaultTasks: Task[] = [
      { id: "1", name: "Product Launch", duration_days: 1, dependencies: ["2"] },
      { id: "2", name: "Final QA", duration_days: 3, dependencies: ["3"] },
      { id: "3", name: "Development", duration_days: 10, dependencies: ["4", "5"] },
      { id: "4", name: "Design", duration_days: 5, dependencies: [] },
      { id: "5", name: "Backend Setup", duration_days: 7, dependencies: [] },
      // Marketing Branch
      { id: "6", name: "Marketing Campaign", duration_days: 5, dependencies: ["7"] },
      { id: "7", name: "Create Ad Assets", duration_days: 3, dependencies: [] },
    ];

    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);
    const dateStr = nextMonth.toISOString().split('T')[0];

    // Anchor both Product Launch and Marketing Campaign to the same date?
    // Or make Marketing depend on Launch? 
    // Usually Marketing starts *before* launch. 
    // Let's say Marketing Campaign must FINISH by Launch.
    // So "Product Launch" depends on "Marketing Campaign"? 
    // No, Launch is the event. Marketing leads up to it.
    // So "Product Launch" has dependency "Marketing Campaign" OR they are both anchored to the same date.
    // Let's try multi-anchor.
    const defaultAnchors = { "1": dateStr, "6": dateStr };

    handleScheduleIdnitial({ tasks: defaultTasks, anchors: defaultAnchors });
  }, []); // Run once on mount

  const handleScheduleIdnitial = async (request: ScheduleRequest) => {
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
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center md:text-left">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Anchor <span className="text-blue-600">Retro</span></h1>
          <p className="text-gray-600 mt-2">Plan backwards. Finish on time.</p>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <DeadlineDisplay anchorDate={anchors[Object.keys(anchors)[0]] || ''} />
            <TaskForm onSchedule={handleScheduleIdnitial} existingTasks={tasks} existingAnchors={anchors} />
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 flex gap-1 mb-4 w-fit">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'timeline'
                  ? 'bg-gray-100 text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'calendar'
                  ? 'bg-gray-100 text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Calendar
              </button>
            </div>

            {viewMode === 'timeline' ? (
              <Timeline tasks={scheduledTasks} definitions={tasks} />
            ) : (
              <CalendarView tasks={scheduledTasks} onTaskMove={handleTaskMove} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
