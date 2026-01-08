use chrono::{Duration, NaiveDate};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub name: String,
    pub duration_days: i64,
    pub dependencies: Vec<String>, // IDs of tasks that must finish before this one starts
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScheduledTask {
    pub id: String,
    pub name: String,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScheduleRequest {
    pub tasks: Vec<Task>,
    // Map of TaskID -> EndDate (YYYY-MM-DD)
    pub anchors: HashMap<String, String>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn calculate_backwards_schedule(request: ScheduleRequest) -> Result<Vec<ScheduledTask>, String> {
    let mut task_map: HashMap<String, Task> = HashMap::new();
    let mut dependents: HashMap<String, Vec<String>> = HashMap::new(); // key: task, value: list of tasks that depend on 'key'

    for task in &request.tasks {
        task_map.insert(task.id.clone(), task.clone());
        for dep_id in &task.dependencies {
            dependents
                .entry(dep_id.clone())
                .or_default()
                .push(task.id.clone());
        }
    }

    let mut scheduled_tasks: HashMap<String, ScheduledTask> = HashMap::new();
    // Initial pass: Schedule anchor tasks
    for (task_id, date_str) in &request.anchors {
        if let Some(task) = task_map.get(task_id) {
            let end_date = NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
                .map_err(|e| format!("Invalid anchor date for task {}: {}", task_id, e))?;
            let start_date = end_date - Duration::days(task.duration_days);
            scheduled_tasks.insert(
                task_id.clone(),
                ScheduledTask {
                    id: task.id.clone(),
                    name: task.name.clone(),
                    start_date: start_date.to_string(),
                    end_date: end_date.to_string(),
                },
            );
        } else {
            return Err(format!("Anchor task task_id={} not found", task_id));
        }
    }

    // Now propagate backwards.
    // We need to schedule dependencies of the currently scheduled tasks.
    // Topological sort (reverse) approach:
    // We processed "Anchor Tasks". Now we need to process tasks that are dependencies of these.

    // Actually, simple recursion with memoization or iterative processing of dependencies is better.
    // But we need to define the 'end date' of a dependency.
    // If A -> B (A is dependency of B), A.end = B.start.
    // If A -> B and A -> C, A.end = min(B.start, C.start).

    // So we need to compute 'end dates' for all tasks.
    // Initialize end_dates map.
    let mut end_dates: HashMap<String, NaiveDate> = HashMap::new();

    for (task_id, date_str) in &request.anchors {
        let date = NaiveDate::parse_from_str(date_str, "%Y-%m-%d").unwrap(); // Already parsed above effectively
        end_dates.insert(task_id.clone(), date);
    }

    // We need to iterate until all tasks are scheduled.
    // A task can be scheduled when all its "parents" (tasks that depend on it) are scheduled.
    // "Parents" in the dependency graph: B depends on A. B is the "Consumer". A is the "Provider".
    // We are scheduling from Consumers back to Providers.
    // So we need to know: For A, who consumes it? (dependents map).
    // If all consumers of A have a start_date, we can determine A's end_date.

    // We need a count of unscheduled consumers for each task?
    // Not strictly. If we schedule B, we can 'update' A's requirement.

    // Build dependents graph (Consumer -> Provider is task.dependencies).
    // Reverse graph (Provider -> Consumer) is `dependents`.
    // Wait, the input `Task.dependencies` lists Providers.
    // B.dependencies = [A]. So B depends on A. A must finish before B starts.
    // Flow: A -> B.
    // We start with B (known end date). We calculate B's start date.
    // Then we say: A's end date must be <= B's start date.
    // If A is also consumed by C, A's end date <= C's start date.
    // So A.end_date = min(consumers.map(|c| c.start_date)).

    // Algorithm:
    // 1. Queue = [tasks with no consumers (or explicitly anchored)].
    //    Note: The user explicitly provides `anchor_task_ids`. These are the roots.
    // 2. While Queue is not empty:
    //    Pop T.
    //    Calculate T.start = T.end - T.duration.
    //    For each dependency D of T:
    //      Update D.max_end_date = min(D.max_end_date, T.start).
    //      If D is ready to be processed (all its consumers have been processed), add to Queue.

    // How to know if all consumers are processed?
    // We count `dependents[D].len()`. And we decrement a counter as we process consumers.

    // Initialize `unscheduled_consumers_count` for each task.
    let mut unscheduled_consumers_count: HashMap<String, usize> = HashMap::new();

    for (provider_id, consumers) in &dependents {
        unscheduled_consumers_count.insert(provider_id.clone(), consumers.len());
    }

    // Initialize queue with 'roots' (Anchor tasks).
    let mut queue: Vec<String> = request.anchors.keys().cloned().collect();

    // Map to store determined end dates. Initialize with liberal max date?
    // No, we insert when we process.
    // Wait, for a provider D, we update its Tentative End Date repeatedly?
    // Yes. initialize D.end_date = MAX.
    // When processing consumer T, D.end_date = min(D.end_date, T.start).

    let mut computed_end_dates: HashMap<String, NaiveDate> = end_dates;
    // For anchor tasks, end_date is fixed.

    let mut result = Vec::new();
    let mut visited = HashSet::new(); // To avoid cycles if any (should detect)

    while let Some(task_id) = queue.pop() {
        if visited.contains(&task_id) {
            continue;
            // Or error on cycle? If we visit twice, it might be a diamond dependency. ADG is fine.
            // But we only process when 'ready'. So we shouldn't visit twice?
            // Actually, if we use the 'unscheduled_consumers_count' method, we only add to queue once.
        }
        visited.insert(task_id.clone());

        let task = match task_map.get(&task_id) {
            Some(t) => t,
            None => return Err(format!("Task {} not found", task_id)),
        };

        // Determine end date
        let end_date = *computed_end_dates
            .get(&task_id)
            .ok_or(format!("End date not computed for {}", task_id))?;
        let start_date = end_date - Duration::days(task.duration_days);

        result.push(ScheduledTask {
            id: task.id.clone(),
            name: task.name.clone(),
            start_date: start_date.to_string(),
            end_date: end_date.to_string(),
        });

        // Propagate to dependencies (Providers)
        for provider_id in &task.dependencies {
            let entry = computed_end_dates
                .entry(provider_id.clone())
                .or_insert(NaiveDate::MAX);
            if start_date < *entry {
                *entry = start_date;
            }

            // Check if provider is ready
            if let Some(count) = unscheduled_consumers_count.get_mut(provider_id) {
                *count -= 1;
                if *count == 0 {
                    queue.push(provider_id.clone());
                }
            } else {
                // Provider has no consumers? That contradicts "dependents" map logic.
                // Unless it wasn't in dependents map? (It should be if we built it correctly).
                // Wait, we built 'dependents' by iterating all tasks.
                // If provider has consumers, it should be in 'dependents'.
                // If unscheduled_consumers_count has no entry, it means it had 0 consumers to begin with.
                // But we are in the loop of a consumer 'task', so it has at least 1 consumer ('task').
                // Ah, maybe we didn't populate unscheduled_consumers_count correctly for all providers?
            }
        }
    }

    // Catch orphans (tasks that are not dependencies of any anchor task and not anchors themselves)
    // They won't be visited.

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            calculate_backwards_schedule
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
