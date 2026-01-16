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

#[tauri::command]
fn test_notification(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title("Rust Test")
        .body("This is a test from Rust backend")
        .show()
        .map_err(|e| e.to_string())?;
    Ok("Notification sent from Rust".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_desktop_underlay::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // let app_handle = app.handle().clone();

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

            // Tray Setup
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::TrayIconBuilder;

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show Anchor", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            schedule,
            test_notification,
            project::create_project,
            project::load_project,
            project::save_project,
            project::list_projects,
            project::delete_project,
            config::load_config,
            config::save_config,
            project::get_next_deadline,
            project::get_widget_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
