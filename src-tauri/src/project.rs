use crate::scheduler::Task;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub last_modified: String,
    pub tasks: Vec<Task>,
    pub anchors: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectMetadata {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub last_modified: String,
    pub task_count: usize,
    pub next_deadline: Option<String>,
    pub current_focus: Option<String>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WidgetTask {
    pub id: String,
    pub name: String,
    pub start_date: String,
    pub end_date: String,
    pub completed: bool,
    pub is_milestone: bool,
    pub status: String, // "active", "future", "overdue"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WidgetInfo {
    pub project_id: String,
    pub project_name: String,
    pub next_deadline: Option<String>,
    pub status: String,
    pub current_focus: Option<String>,
    pub upcoming_tasks: Vec<WidgetTask>,
    pub calendar_tasks: Vec<WidgetTask>,
    pub all_projects: Vec<ProjectSummary>,
    pub task_progress: Option<f32>,
}

// Helper to get projects directory: app_data_dir/projects
fn get_projects_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let projects_dir = app_data_dir.join("projects");
    if !projects_dir.exists() {
        fs::create_dir_all(&projects_dir).map_err(|e| e.to_string())?;
    }
    Ok(projects_dir)
}

#[tauri::command]
pub fn create_project(app: AppHandle, name: String) -> Result<Project, String> {
    let now = chrono::Local::now().to_rfc3339();
    let project = Project {
        id: Uuid::new_v4().to_string(),
        name,
        created_at: now.clone(),
        last_modified: now,
        tasks: vec![],
        anchors: HashMap::new(),
    };

    save_project(app, project.clone())?;
    Ok(project)
}

#[tauri::command]
pub fn save_project(app: AppHandle, mut project: Project) -> Result<(), String> {
    let dir = get_projects_dir(&app)?;
    project.last_modified = chrono::Local::now().to_rfc3339();
    let path = dir.join(format!("{}.json", project.id));
    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;

    // Emit update event
    use tauri::Emitter;
    let _ = app.emit("project-update", ());

    Ok(())
}

#[tauri::command]
pub fn load_project(app: AppHandle, id: String) -> Result<Project, String> {
    let dir = get_projects_dir(&app)?;
    let path = dir.join(format!("{}.json", id));

    if !path.exists() {
        return Err(format!("Project {} not found", id));
    }

    let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let project: Project = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(project)
}

fn parse_date_or_datetime(s: &str) -> Option<chrono::NaiveDateTime> {
    // Try DateTime first
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S") {
        return Some(dt);
    }
    // Fallback to Date (end of day)
    if let Ok(d) = chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        return d.and_hms_opt(23, 59, 59);
    }
    None
}

#[tauri::command]
pub fn list_projects(app: AppHandle) -> Result<Vec<ProjectMetadata>, String> {
    let dir = get_projects_dir(&app)?;
    let mut projects = Vec::new();
    let now = chrono::Local::now().naive_local();

    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(project) = serde_json::from_str::<Project>(&content) {
                    // Calculate derived metadata
                    let mut next_deadline = None;
                    let mut current_focus = None;
                    let mut status = "empty".to_string();

                    if !project.anchors.is_empty() {
                        // Default to Anchor for deadline/status
                        let mut anchors: Vec<chrono::NaiveDateTime> = project
                            .anchors
                            .values()
                            .filter_map(|d| parse_date_or_datetime(d))
                            .filter(|d| *d >= now)
                            .collect();
                        anchors.sort();

                        // Default to nearest anchor
                        if let Some(anchor) = anchors.first() {
                            next_deadline = Some(anchor.format("%Y-%m-%d %H:%M").to_string());
                            let duration = *anchor - now;
                            let days = duration.num_days();
                            status = if duration.num_seconds() < 0 {
                                "overdue".to_string()
                            } else if days <= 5 {
                                "urgent".to_string()
                            } else {
                                "on_track".to_string()
                            };
                        } else {
                            status = "overdue".to_string(); // All anchors passed
                        }

                        // Try to find a better "Next Deadline" from the schedule (Next Task)
                        let req = crate::scheduler::ScheduleRequest {
                            tasks: project.tasks.clone(),
                            anchors: project.anchors.clone(),
                        };

                        if let Ok(schedule) = crate::scheduler::calculate_backwards_schedule(req) {
                            // Find active or next upcoming task (excluding completed ones)
                            let mut active_or_upcoming = schedule
                                .iter()
                                .filter(|t| !t.completed)
                                .filter_map(|t| {
                                    let start = chrono::NaiveDateTime::parse_from_str(
                                        &t.start_date,
                                        "%Y-%m-%dT%H:%M:%S",
                                    )
                                    .ok()?;
                                    let end = chrono::NaiveDateTime::parse_from_str(
                                        &t.end_date,
                                        "%Y-%m-%dT%H:%M:%S",
                                    )
                                    .ok()?;
                                    // Include if it ends now or in future
                                    if end >= now {
                                        Some((start, end, t))
                                    } else {
                                        None
                                    }
                                })
                                .collect::<Vec<_>>();

                            // Sort by end date (deadline)
                            active_or_upcoming.sort_by_key(|(_, end, _)| *end);

                            if let Some((start, end, task)) = active_or_upcoming.first() {
                                // Update Next Deadline to this task's deadline
                                next_deadline = Some(end.format("%Y-%m-%d %H:%M").to_string());

                                // Update Status based on THIS deadline
                                let duration = *end - now;
                                let days = duration.num_days();
                                status = if duration.num_seconds() < 0 {
                                    "overdue".to_string()
                                } else if days <= 2 {
                                    "urgent".to_string()
                                } else {
                                    "on_track".to_string()
                                };

                                // Set Current Focus text
                                if now >= *start && now <= *end {
                                    current_focus = Some(task.name.clone());
                                } else {
                                    let start_duration = *start - now;
                                    let start_days = start_duration.num_days();
                                    let start_hours = start_duration.num_hours();

                                    if start_days > 0 {
                                        current_focus = Some(format!(
                                            "{} (starts in {} days)",
                                            task.name, start_days
                                        ));
                                    } else {
                                        current_focus = Some(format!(
                                            "{} (starts in {} hours)",
                                            task.name, start_hours
                                        ));
                                    }
                                }
                            } else {
                                current_focus = Some("All tasks completed".to_string());
                            }
                        }
                    }

                    projects.push(ProjectMetadata {
                        id: project.id,
                        name: project.name,
                        created_at: project.created_at,
                        last_modified: project.last_modified,
                        task_count: project.tasks.len(),
                        next_deadline,
                        current_focus,
                        status,
                    });
                }
            }
        }
    }

    // Sort by last modified desc
    projects.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));

    Ok(projects)
}

#[tauri::command]
pub fn delete_project(app: AppHandle, id: String) -> Result<(), String> {
    let dir = get_projects_dir(&app)?;
    let path = dir.join(format!("{}.json", id));
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;

        // Emit update event
        use tauri::Emitter;
        let _ = app.emit("project-update", ());
    }
    Ok(())
}

#[tauri::command]
pub fn get_next_deadline(app: AppHandle) -> Result<Option<ProjectMetadata>, String> {
    let projects = list_projects(app)?;
    // Return the first project since list_projects sorts by last_modified
    Ok(projects.first().cloned())
}

#[tauri::command]
pub fn get_widget_info(
    app: AppHandle,
    project_id: Option<String>,
) -> Result<Option<WidgetInfo>, String> {
    // 1. Get all projects
    let projects = list_projects(app.clone())?;

    // 2. Determine target project
    let target_metadata = if let Some(id) = project_id {
        projects.iter().find(|p| p.id == id).cloned()
    } else {
        projects.first().cloned()
    };

    let metadata = match target_metadata {
        Some(m) => m,
        None => return Ok(None),
    };

    // 3. Prepare summary list for switching
    let all_projects = projects
        .iter()
        .map(|p| ProjectSummary {
            id: p.id.clone(),
            name: p.name.clone(),
        })
        .collect();

    // 4. Load full project for scheduling
    let project = load_project(app, metadata.id.clone())?;

    // 5. Calculate schedule
    let req = crate::scheduler::ScheduleRequest {
        tasks: project.tasks.clone(),
        anchors: project.anchors.clone(),
    };

    let schedule =
        crate::scheduler::calculate_backwards_schedule(req).map_err(|e| e.to_string())?;

    let now = chrono::Local::now().naive_local();

    // 6. Process tasks for "Up Next" list
    let mut upcoming_tasks = Vec::new();

    // Filter and sort tasks
    let mut sorted_tasks = schedule.clone();
    sorted_tasks.sort_by(|a, b| a.start_date.cmp(&b.start_date)); // Sort by start date

    for task in sorted_tasks {
        if task.completed {
            continue;
        }

        if let (Ok(start), Ok(end)) = (
            chrono::NaiveDateTime::parse_from_str(&task.start_date, "%Y-%m-%dT%H:%M:%S"),
            chrono::NaiveDateTime::parse_from_str(&task.end_date, "%Y-%m-%dT%H:%M:%S"),
        ) {
            // Only show tasks that end now or in the future
            if end >= now {
                let status = if end < now {
                    "overdue".to_string()
                } else if start <= now && end >= now {
                    "active".to_string()
                } else {
                    "future".to_string()
                };

                upcoming_tasks.push(WidgetTask {
                    id: task.id,
                    name: task.name,
                    start_date: task.start_date,
                    end_date: task.end_date,
                    completed: task.completed,
                    is_milestone: task.is_milestone,
                    status,
                });
            }
        }
    }

    let calendar_tasks = upcoming_tasks.clone();
    let top_tasks = upcoming_tasks.into_iter().take(5).collect();

    // Calculate Task Progress for the active/next task

    // logic from list_projects reused partly here to find the "current" task for progress
    // We need to re-find the "active" task from the full schedule
    let mut active_or_next = schedule
        .iter()
        .filter_map(|t| {
            let start =
                chrono::NaiveDateTime::parse_from_str(&t.start_date, "%Y-%m-%dT%H:%M:%S").ok()?;
            let end =
                chrono::NaiveDateTime::parse_from_str(&t.end_date, "%Y-%m-%dT%H:%M:%S").ok()?;

            Some((start, end, t))
        })
        .collect::<Vec<_>>();
    active_or_next.sort_by_key(|(_, end, _)| *end);

    // Find the task that matches "current_focus" name if possible, or just the first non-completed
    let target_task_tuple = active_or_next.iter().find(|(start, end, t)| {
        if t.completed {
            return false;
        } // prioritized uncompleted
          // If now is in range, this is definitely it
        if now >= *start && now <= *end {
            return true;
        }
        // If now is before start, this is the upcoming one
        if now < *start {
            return true;
        }
        false
    });

    let task_progress = if let Some((start, end, task)) = target_task_tuple {
        if task.completed {
            Some(1.0f32)
        } else {
            let total_seconds = (*end - *start).num_seconds().max(1) as f32;
            let elapsed = (now - *start).num_seconds().max(0) as f32;

            let p = elapsed / total_seconds;
            Some(p.clamp(0.0f32, 1.0f32))
        }
    } else {
        // Maybe all tasks are completed? Check if there's ANY task
        if !schedule.is_empty() && schedule.iter().all(|t| t.completed) {
            Some(1.0f32) // Project done
        } else {
            Some(0.0f32) // Start of project
        }
    };

    Ok(Some(WidgetInfo {
        project_id: metadata.id.clone(),
        project_name: metadata.name.clone(),
        next_deadline: metadata.next_deadline.clone(),
        status: metadata.status.clone(),
        current_focus: metadata.current_focus.clone(),
        upcoming_tasks: top_tasks,
        calendar_tasks,
        all_projects,
        task_progress,
    }))
}
