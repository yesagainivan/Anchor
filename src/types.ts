export interface Task {
    id: string;
    name: string;
    duration_days: number;
    duration_minutes?: number; // Optional minute precision
    dependencies: string[];
    completed?: boolean;
    notes?: string;
    is_milestone?: boolean;
    subtasks?: SubTask[];
}

export interface SubTask {
    id: string;
    name: string;
    completed: boolean;
}

export interface ScheduledTask {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    completed: boolean;
    notes?: string;
    is_critical: boolean;
    slack_days: number;
    is_milestone: boolean;
}

export interface ScheduleRequest {
    tasks: Task[];
    anchors: Record<string, string>; // TaskId -> YYYY-MM-DD
}

export interface Project {
    id: string;
    name: string;
    created_at: string;
    last_modified: string;
    tasks: Task[];
    anchors: Record<string, string>;
}

export interface ProjectMetadata {
    id: string;
    name: string;
    created_at: string;
    last_modified: string;
    task_count: number;
    next_deadline: string | null;
    current_focus: string | null;
    status: 'empty' | 'on_track' | 'urgent' | 'overdue';
}
