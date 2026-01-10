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

    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            // We just read the whole file to get metadata for now.
            // In a real app with huge files we might want a separate index or header reading.
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(project) = serde_json::from_str::<Project>(&content) {
                    projects.push(ProjectMetadata {
                        id: project.id,
                        name: project.name,
                        created_at: project.created_at,
                        last_modified: project.last_modified,
                        task_count: project.tasks.len(),
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
