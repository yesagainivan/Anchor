//! Anchor - Backwards planning for projects.
//!
//! A Tauri application that helps you plan projects by working backwards
//! from deadlines to determine when you need to start.

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
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![schedule])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
