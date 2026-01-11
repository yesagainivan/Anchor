//! Anchor - Backwards planning for projects.
//!
//! A Tauri application that helps you plan projects by working backwards
//! from deadlines to determine when you need to start.

mod config;
mod project;
mod scheduler;

use scheduler::calculate_backwards_schedule;
pub use scheduler::{ScheduleRequest, ScheduledTask, Task};

#[tauri::command]
fn schedule(request: ScheduleRequest) -> Result<Vec<ScheduledTask>, String> {
    calculate_backwards_schedule(request).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_desktop_underlay::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Listen for new windows to apply vibrancy
            // OR just check if 'widget' exists directly if created at startup (it is in tauri.conf.json)
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("widget") {
                #[cfg(target_os = "macos")]
                {
                    use window_vibrancy::{
                        apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState,
                    };
                    let _ = apply_vibrancy(
                        &window,
                        NSVisualEffectMaterial::HudWindow,
                        Some(NSVisualEffectState::Active),
                        Some(16.0),
                    );
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            schedule,
            project::create_project,
            project::load_project,
            project::save_project,
            project::list_projects,
            project::delete_project,
            config::load_config,
            config::save_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
