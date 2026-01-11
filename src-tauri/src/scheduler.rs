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
    #[serde(default)]
    pub completed: bool,
}

/// A scheduled task with computed start and end dates.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScheduledTask {
    pub id: String,
    pub name: String,
    pub start_date: String,
    pub end_date: String,
    pub completed: bool,
    pub is_critical: bool,
    pub slack_days: i64,
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

/// Calculate a backwards schedule with critical path analysis.
pub fn calculate_backwards_schedule(
    request: ScheduleRequest,
) -> Result<Vec<ScheduledTask>, ScheduleError> {
    let task_map: HashMap<String, Task> = request
        .tasks
        .iter()
        .map(|t| (t.id.clone(), t.clone()))
        .collect();

    // --- Backward Pass (Calculate Late Start/Finish) ---

    // Build reverse dependency map: provider -> consumers (to find roots for backward pass)
    // Actually, for backward pass "roots" are anchors.
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
    let mut late_finish: HashMap<String, NaiveDate> = HashMap::new();
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
        late_finish.insert(task_id.clone(), date);
    }

    let mut unscheduled_consumers: HashMap<String, usize> = dependents
        .iter()
        .map(|(id, consumers)| (id.clone(), consumers.len()))
        .collect();

    let mut queue: Vec<String> = request.anchors.keys().cloned().collect();
    let mut visited_backward = HashSet::new(); // Ensure we don't process same node twice in queue loop (though topological sort handles this naturally with counts)

    // We need to capture the results of the backward pass
    let mut backward_schedule: HashMap<String, (NaiveDate, NaiveDate)> = HashMap::new(); // id -> (start, end)

    // Using a proper topological sort based on unscheduled_consumers count
    while let Some(task_id) = queue.pop() {
        if visited_backward.contains(&task_id) {
            continue;
        }

        let task = task_map
            .get(&task_id)
            .ok_or_else(|| ScheduleError::TaskNotFound(task_id.clone()))?;

        // Late Finish is already set either by Anchor or by successors
        let lf = *late_finish
            .get(&task_id)
            .ok_or_else(|| ScheduleError::NoEndDateComputed(task_id.clone()))?;

        let ls = lf - Duration::days(task.duration_days);
        backward_schedule.insert(task.id.clone(), (ls, lf));
        visited_backward.insert(task_id.clone());

        // Propagate to dependencies (providers)
        for provider_id in &task.dependencies {
            // Provider must end by this task's start (Late Finish of provider <= Late Start of consumer)
            let entry = late_finish
                .entry(provider_id.clone())
                .or_insert(NaiveDate::MAX);
            if ls < *entry {
                *entry = ls;
            }

            // Decrement consumer count
            if let Some(count) = unscheduled_consumers.get_mut(provider_id) {
                *count -= 1;
                if *count == 0 {
                    queue.push(provider_id.clone());
                }
            }
        }
    }

    // Verify all tasks were scheduled
    if backward_schedule.len() != request.tasks.len() {
        // Find which tasks are missing
        let scheduled_ids: HashSet<_> = backward_schedule.keys().collect();
        let missing_tasks: Vec<String> = request
            .tasks
            .iter()
            .filter(|t| !scheduled_ids.contains(&t.id))
            .map(|t| t.name.clone())
            .collect();

        if !missing_tasks.is_empty() {
            return Err(ScheduleError::NoEndDateComputed(format!(
                "Tasks not processing from anchors (disconnected?): {:?}",
                missing_tasks
            )));
        }
    }

    // --- Forward Pass (Calculate Early Start/Finish) ---

    // Project start is the earliest start date from the backward pass
    let project_start = backward_schedule
        .values()
        .map(|(start, _)| *start)
        .min()
        .ok_or(ScheduleError::CycleDetected)?; // Should not be empty if tasks exist

    let mut early_finish: HashMap<String, NaiveDate> = HashMap::new();
    let mut early_start: HashMap<String, NaiveDate> = HashMap::new();

    // In-degrees for Forward Pass are simply the number of dependencies
    let mut in_degree: HashMap<String, usize> = request
        .tasks
        .iter()
        .map(|t| (t.id.clone(), t.dependencies.len()))
        .collect();

    // Queue for forward pass (Tasks with 0 dependencies)
    let mut forward_queue: Vec<String> = request
        .tasks
        .iter()
        .filter(|t| t.dependencies.is_empty())
        .map(|t| t.id.clone())
        .collect();

    let mut visited_forward = HashSet::new();

    while let Some(task_id) = forward_queue.pop() {
        visited_forward.insert(task_id.clone());
        let task = task_map.get(&task_id).unwrap();

        // Calculate Early Start (ES)
        // ES = max(EF of dependencies), else Project Start
        let es = if task.dependencies.is_empty() {
            project_start
        } else {
            let mut max_ef = project_start; // Fallback
            for dep in &task.dependencies {
                if let Some(&ef) = early_finish.get(dep) {
                    if ef > max_ef {
                        max_ef = ef;
                    }
                }
            }
            max_ef
        };

        let ef = es + Duration::days(task.duration_days);
        early_start.insert(task_id.clone(), es);
        early_finish.insert(task_id.clone(), ef);

        // Propagate to consumers (dependents)
        if let Some(consumers) = dependents.get(&task_id) {
            for consumer in consumers {
                if let Some(degree) = in_degree.get_mut(consumer) {
                    *degree -= 1;
                    if *degree == 0 {
                        forward_queue.push(consumer.clone());
                    }
                }
            }
        }
    }

    // --- Combine & Result ---

    let mut final_schedule = Vec::new();

    for task in &request.tasks {
        if let Some((ls, lf)) = backward_schedule.get(&task.id) {
            let es = early_start.get(&task.id).unwrap_or(ls); // Fallback if forward pass missed it (disconnected?)

            // Slack = LS - ES
            let slack_days = (*ls - *es).num_days();
            let is_critical = slack_days <= 0; // Float precision or tight constraints

            final_schedule.push(ScheduledTask {
                id: task.id.clone(),
                name: task.name.clone(),
                start_date: ls.to_string(),
                end_date: lf.to_string(),
                completed: task.completed,
                is_critical,
                slack_days,
            });
        }
    }

    Ok(final_schedule)
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
                    completed: false,
                },
                Task {
                    id: "b".into(),
                    name: "Task B".into(),
                    duration_days: 3,
                    dependencies: vec!["a".into()],
                    completed: false,
                },
            ],
            anchors: [("b".into(), "2026-01-15".into())].into(),
        };

        let result = calculate_backwards_schedule(request).unwrap();
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_disconnected_subgraph() {
        let request = ScheduleRequest {
            tasks: vec![
                Task {
                    id: "a".into(),
                    name: "Task A".into(),
                    duration_days: 5,
                    dependencies: vec![],
                    completed: false,
                },
                Task {
                    id: "b".into(),
                    name: "Task B".into(),
                    duration_days: 3,
                    dependencies: vec![], // Disconnected
                    completed: false,
                },
            ],
            anchors: [("a".into(), "2026-01-15".into())].into(),
        };

        let result = calculate_backwards_schedule(request);
        assert!(result.is_err());
        match result {
            Err(ScheduleError::NoEndDateComputed(msg)) => {
                assert!(msg.contains("Task B"));
            }
            _ => panic!("Expected NoEndDateComputed error"),
        }
    }
}
