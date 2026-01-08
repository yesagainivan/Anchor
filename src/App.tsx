import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TaskForm } from "./components/TaskForm";
import { Timeline } from "./components/Timeline";
import { CalendarView } from "./components/CalendarView";
import { ScheduleRequest, ScheduledTask } from "./types";
import "./App.css";

function App() {
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');

  const handleSchedule = async (request: ScheduleRequest) => {
    try {
      const result = await invoke<ScheduledTask[]>("calculate_backwards_schedule", { request });
      setScheduledTasks(result);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(typeof e === 'string' ? e : "An unexpected error occurred");
    }
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
            <TaskForm onSchedule={handleSchedule} />
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
              <Timeline tasks={scheduledTasks} />
            ) : (
              <CalendarView tasks={scheduledTasks} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
