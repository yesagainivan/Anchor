use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub theme: String, // "light", "dark", "system"
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
        }
    }
}

fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    }
    Ok(app_data_dir.join("config.json"))
}

#[tauri::command]
pub fn load_config(app: AppHandle) -> Result<AppConfig, String> {
    let path = get_config_path(&app)?;
    if !path.exists() {
        return Ok(AppConfig::default());
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let config: AppConfig = serde_json::from_str(&content).unwrap_or_default();
    Ok(config)
}

#[tauri::command]
pub fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let path = get_config_path(&app)?;
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}
