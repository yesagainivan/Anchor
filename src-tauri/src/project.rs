use crate::scheduler::Task;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri::Manager;
use thiserror::Error;
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

#[derive(Debug, Serialize, Deserialize)]
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

#[derive(Debug, Error)]
pub enum ProjectError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Project not found: {0}")]
    NotFound(String),
}

impl ProjectError {
    pub fn to_string(&self) -> String {
        format!("{}", self)
    }
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

#[tauri::command]
pub fn list_projects(app: AppHandle) -> Result<Vec<ProjectMetadata>, String> {
    let dir = get_projects_dir(&app)?;
    let mut projects = Vec::new();
    let today = chrono::Local::now().date_naive();

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
                        let mut anchors: Vec<chrono::NaiveDate> = project
                            .anchors
                            .values()
                            .filter_map(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
                            .filter(|d| *d >= today)
                            .collect();
                        anchors.sort();

                        // Default to nearest anchor
                        if let Some(anchor) = anchors.first() {
                            next_deadline = Some(anchor.to_string());
                            let days = (*anchor - today).num_days();
                            status = if days < 0 {
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
                                    let start = chrono::NaiveDate::parse_from_str(
                                        &t.start_date,
                                        "%Y-%m-%d",
                                    )
                                    .ok()?;
                                    let end =
                                        chrono::NaiveDate::parse_from_str(&t.end_date, "%Y-%m-%d")
                                            .ok()?;
                                    // Include if it ends today or in future
                                    if end >= today {
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
                                next_deadline = Some(end.to_string());

                                // Update Status based on THIS deadline
                                let days = (*end - today).num_days();
                                status = if days < 0 {
                                    "overdue".to_string()
                                } else if days <= 5 {
                                    "urgent".to_string()
                                } else {
                                    "on_track".to_string()
                                };

                                // Set Current Focus text
                                if today >= *start && today <= *end {
                                    current_focus = Some(task.name.clone());
                                } else {
                                    let start_days = (*start - today).num_days();
                                    current_focus = Some(format!(
                                        "{} (starts in {} days)",
                                        task.name, start_days
                                    ));
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
    }
    Ok(())
}
