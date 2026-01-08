//! Backwards scheduler module for Anchor.
//!
//! Implements the core scheduling algorithm that works backwards from anchor dates
//! to determine when predecessor tasks must start.

use chrono::{Duration, NaiveDate};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use thiserror::Error;

/// A task definition with dependencies.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub name: String,
    pub duration_days: i64,
    /// IDs of tasks that must complete before this one can start.
    pub dependencies: Vec<String>,
}

/// A scheduled task with computed start and end dates.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScheduledTask {
    pub id: String,
    pub name: String,
    pub start_date: String,
    pub end_date: String,
}

/// Request to calculate a backwards schedule.
#[derive(Debug, Serialize, Deserialize)]
pub struct ScheduleRequest {
    pub tasks: Vec<Task>,
    /// Map of TaskID → EndDate (YYYY-MM-DD) for anchor tasks.
    pub anchors: HashMap<String, String>,
}

/// Errors that can occur during schedule calculation.
#[derive(Debug, Error)]
pub enum ScheduleError {
    #[error("Invalid date format for anchor task '{task_id}': {details}")]
    InvalidAnchorDate { task_id: String, details: String },

    #[error("Anchor task '{0}' not found in task list")]
    AnchorTaskNotFound(String),

    #[error("Task '{0}' not found")]
    TaskNotFound(String),

    #[error("No end date computed for task '{0}' - check for disconnected dependencies")]
    NoEndDateComputed(String),

    #[allow(dead_code)]
    #[error("Cycle detected in task dependencies")]
    CycleDetected,
}

/// Calculate a backwards schedule from anchor dates.
///
/// Works by propagating backwards from anchor tasks: if task B depends on task A,
/// then A must finish by the time B starts.
pub fn calculate_backwards_schedule(
    request: ScheduleRequest,
) -> Result<Vec<ScheduledTask>, ScheduleError> {
    let task_map: HashMap<String, Task> = request
        .tasks
        .iter()
        .map(|t| (t.id.clone(), t.clone()))
        .collect();

    // Build reverse dependency map: provider → list of consumers
    let mut dependents: HashMap<String, Vec<String>> = HashMap::new();
    for task in &request.tasks {
        for dep_id in &task.dependencies {
            dependents
                .entry(dep_id.clone())
                .or_default()
                .push(task.id.clone());
        }
    }

    // Initialize end dates from anchors
    let mut computed_end_dates: HashMap<String, NaiveDate> = HashMap::new();
    for (task_id, date_str) in &request.anchors {
        if !task_map.contains_key(task_id) {
            return Err(ScheduleError::AnchorTaskNotFound(task_id.clone()));
        }
        let date = NaiveDate::parse_from_str(date_str, "%Y-%m-%d").map_err(|e| {
            ScheduleError::InvalidAnchorDate {
                task_id: task_id.clone(),
                details: e.to_string(),
            }
        })?;
        computed_end_dates.insert(task_id.clone(), date);
    }

    // Track how many consumers remain unscheduled for each provider
    let mut unscheduled_consumers: HashMap<String, usize> = dependents
        .iter()
        .map(|(id, consumers)| (id.clone(), consumers.len()))
        .collect();

    // Start with anchor tasks
    let mut queue: Vec<String> = request.anchors.keys().cloned().collect();
    let mut visited = HashSet::new();
    let mut result = Vec::new();

    while let Some(task_id) = queue.pop() {
        if visited.contains(&task_id) {
            continue;
        }
        visited.insert(task_id.clone());

        let task = task_map
            .get(&task_id)
            .ok_or_else(|| ScheduleError::TaskNotFound(task_id.clone()))?;

        let end_date = *computed_end_dates
            .get(&task_id)
            .ok_or_else(|| ScheduleError::NoEndDateComputed(task_id.clone()))?;

        let start_date = end_date - Duration::days(task.duration_days);

        result.push(ScheduledTask {
            id: task.id.clone(),
            name: task.name.clone(),
            start_date: start_date.to_string(),
            end_date: end_date.to_string(),
        });

        // Propagate to dependencies (providers)
        for provider_id in &task.dependencies {
            // Provider must end by this task's start
            let entry = computed_end_dates
                .entry(provider_id.clone())
                .or_insert(NaiveDate::MAX);
            if start_date < *entry {
                *entry = start_date;
            }

            // Decrement consumer count; queue when ready
            if let Some(count) = unscheduled_consumers.get_mut(provider_id) {
                *count -= 1;
                if *count == 0 {
                    queue.push(provider_id.clone());
                }
            }
        }
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_chain() {
        let request = ScheduleRequest {
            tasks: vec![
                Task {
                    id: "a".into(),
                    name: "Task A".into(),
                    duration_days: 5,
                    dependencies: vec![],
                },
                Task {
                    id: "b".into(),
                    name: "Task B".into(),
                    duration_days: 3,
                    dependencies: vec!["a".into()],
                },
            ],
            anchors: [("b".into(), "2026-01-15".into())].into(),
        };

        let result = calculate_backwards_schedule(request).unwrap();
        assert_eq!(result.len(), 2);
    }
}
