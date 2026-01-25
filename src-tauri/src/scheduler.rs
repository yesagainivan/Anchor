//! Backwards scheduler module for Anchor.
//!
//! Implements the core scheduling algorithm that works backwards from anchor dates
//! to determine when predecessor tasks must start.

use chrono::{Duration, NaiveDateTime};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use thiserror::Error;

/// A subtask within a larger task.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubTask {
    pub id: String,
    pub name: String,
    pub completed: bool,
}

/// A task definition with dependencies.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub name: String,
    pub duration_days: i64,
    pub duration_minutes: Option<i64>, // New field for minute precision
    /// IDs of tasks that must complete before this one can start.
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub completed: bool,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub is_milestone: bool,
    #[serde(default)]
    pub subtasks: Vec<SubTask>,
}

/// A scheduled task with computed start and end dates.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScheduledTask {
    pub id: String,
    pub name: String,
    pub start_date: String, // ISO 8601 DateTime string
    pub end_date: String,   // ISO 8601 DateTime string
    pub completed: bool,
    pub notes: Option<String>,
    pub is_critical: bool,
    pub slack_minutes: i64, // Changed from slack_days
    pub is_milestone: bool,
}

/// Request to calculate a backwards schedule.
#[derive(Debug, Serialize, Deserialize)]
pub struct ScheduleRequest {
    pub tasks: Vec<Task>,
    /// Map of TaskID → EndDate (ISO 8601 DateTime or YYYY-MM-DD) for anchor tasks.
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

fn parse_date_string(s: &str) -> Result<NaiveDateTime, String> {
    // Try ISO 8601 DateTime first
    if let Ok(dt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S") {
        return Ok(dt);
    }
    // Try YYYY-MM-DD and assume end of day (23:59:59)
    if let Ok(d) = chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        return Ok(d
            .and_hms_opt(23, 59, 59)
            .ok_or("Invalid time construction")?);
    }
    Err(format!(
        "Could not parse date '{}', expected %Y-%m-%dT%H:%M:%S or %Y-%m-%d",
        s
    ))
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

    if request.tasks.is_empty() {
        return Ok(Vec::new());
    }

    // --- Backward Pass (Calculate Late Start/Finish) ---
    // Build reverse dependency map: provider -> consumers (to find roots for backward pass)
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
    let mut late_finish: HashMap<String, NaiveDateTime> = HashMap::new();
    for (task_id, date_str) in &request.anchors {
        if !task_map.contains_key(task_id) {
            return Err(ScheduleError::AnchorTaskNotFound(task_id.clone()));
        }

        let date = parse_date_string(date_str).map_err(|e| ScheduleError::InvalidAnchorDate {
            task_id: task_id.clone(),
            details: e,
        })?;

        late_finish.insert(task_id.clone(), date);
    }

    let mut unscheduled_consumers: HashMap<String, usize> = dependents
        .iter()
        .map(|(id, consumers)| (id.clone(), consumers.len()))
        .collect();

    let mut queue: Vec<String> = request
        .tasks
        .iter()
        .filter(|t| !dependents.contains_key(&t.id))
        .map(|t| t.id.clone())
        .collect();
    let mut visited_backward = HashSet::new();

    // We need to capture the results of the backward pass
    let mut backward_schedule: HashMap<String, (NaiveDateTime, NaiveDateTime)> = HashMap::new(); // id -> (start, end)

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
            .ok_or_else(|| ScheduleError::NoEndDateComputed(task.name.clone()))?;

        // Calculate duration logic
        let duration = if let Some(mins) = task.duration_minutes {
            Duration::minutes(mins)
        } else {
            Duration::days(task.duration_days)
        };

        let ls = lf - duration;
        backward_schedule.insert(task.id.clone(), (ls, lf));
        visited_backward.insert(task_id.clone());

        // Propagate to dependencies (providers)
        for provider_id in &task.dependencies {
            // Provider must end by this task's start (Late Finish of provider <= Late Start of consumer)
            let entry = late_finish
                .entry(provider_id.clone())
                .or_insert(NaiveDateTime::MAX);
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

    let mut early_finish: HashMap<String, NaiveDateTime> = HashMap::new();
    let mut early_start: HashMap<String, NaiveDateTime> = HashMap::new();

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

        let duration = if let Some(mins) = task.duration_minutes {
            Duration::minutes(mins)
        } else {
            Duration::days(task.duration_days)
        };

        let ef = es + duration;
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
            let slack_minutes = (*ls - *es).num_minutes();
            let is_critical = slack_minutes <= 0; // Float precision or tight constraints

            final_schedule.push(ScheduledTask {
                id: task.id.clone(),
                name: task.name.clone(),
                start_date: ls.format("%Y-%m-%dT%H:%M:%S").to_string(),
                end_date: lf.format("%Y-%m-%dT%H:%M:%S").to_string(),
                completed: task.completed,
                notes: task.notes.clone(),
                is_critical,
                slack_minutes,
                is_milestone: task.is_milestone,
            });
        }
    }

    Ok(final_schedule)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_chain_with_days() {
        let request = ScheduleRequest {
            tasks: vec![
                Task {
                    id: "a".into(),
                    name: "Task A".into(),
                    duration_days: 5,
                    duration_minutes: None,
                    dependencies: vec![],
                    completed: false,
                    notes: None,
                    is_milestone: false,
                    subtasks: vec![],
                },
                Task {
                    id: "b".into(),
                    name: "Task B".into(),
                    duration_days: 3,
                    duration_minutes: None,
                    dependencies: vec!["a".into()],
                    completed: false,
                    notes: None,
                    is_milestone: false,
                    subtasks: vec![],
                },
            ],
            anchors: [("b".into(), "2026-01-15".into())].into(),
        };

        let result = calculate_backwards_schedule(request).expect("Should work with days");
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_minute_granularity() {
        // Task A (30 mins) -> Task B (60 mins) -> Anchor at 2026-01-15T10:00:00
        // Expected: B starts at 09:00, A starts at 08:30
        let request = ScheduleRequest {
            tasks: vec![
                Task {
                    id: "a".into(),
                    name: "Task A".into(),
                    duration_days: 0,
                    duration_minutes: Some(30),
                    dependencies: vec![],
                    completed: false,
                    notes: None,
                    is_milestone: false,
                    subtasks: vec![],
                },
                Task {
                    id: "b".into(),
                    name: "Task B".into(),
                    duration_days: 0,
                    duration_minutes: Some(60),
                    dependencies: vec!["a".into()],
                    completed: false,
                    notes: None,
                    is_milestone: false,
                    subtasks: vec![],
                },
            ],
            anchors: [("b".into(), "2026-01-15T10:00:00".into())].into(),
        };

        let result = calculate_backwards_schedule(request).expect("Should work with minutes");

        let task_a = result.iter().find(|t| t.id == "a").unwrap();
        let task_b = result.iter().find(|t| t.id == "b").unwrap();

        assert!(task_b.end_date.contains("10:00:00"));
        assert!(task_b.start_date.contains("09:00:00"));
        assert!(task_a.end_date.contains("09:00:00"));
        assert!(task_a.start_date.contains("08:30:00"));
    }

    #[test]
    fn test_disconnected_subgraph() {
        let request = ScheduleRequest {
            tasks: vec![
                Task {
                    id: "a".into(),
                    name: "Task A".into(),
                    duration_days: 5,
                    duration_minutes: None,
                    dependencies: vec![],
                    completed: false,
                    notes: None,
                    is_milestone: false,
                    subtasks: vec![],
                },
                Task {
                    id: "b".into(),
                    name: "Task B".into(),
                    duration_days: 3,
                    duration_minutes: None,
                    dependencies: vec!["a".into()],
                    completed: false,
                    notes: None,
                    is_milestone: false,
                    subtasks: vec![],
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

    #[test]
    fn test_anchor_with_consumer_constraint() {
        // A -> B.
        // Anchor A at T=20 (Late).
        // Anchor B at T=10 (Early).
        // Duration 1 each (in days, so 24h).
        // A is the provider. B is the consumer.
        // A must finish by:
        //  1. Its own anchor (20)
        //  2. B's start. B ends at 10. Start = 9. So A must end by 9.
        // Expected: A.end_date = 2026-01-09...

        let request = ScheduleRequest {
            tasks: vec![
                Task {
                    id: "a".into(),
                    name: "Task A".into(),
                    duration_days: 1,
                    duration_minutes: None,
                    dependencies: vec![],
                    completed: false,
                    notes: None,
                    is_milestone: false,
                    subtasks: vec![],
                },
                Task {
                    id: "b".into(),
                    name: "Task B".into(),
                    duration_days: 1,
                    duration_minutes: None,
                    dependencies: vec!["a".into()],
                    completed: false,
                    notes: None,
                    is_milestone: false,
                    subtasks: vec![],
                },
            ],
            anchors: [
                ("a".into(), "2026-01-20T00:00:00".into()),
                ("b".into(), "2026-01-10T00:00:00".into()),
            ]
            .into(),
        };

        // Run multiple times to catch potential hashmap randomness
        for _ in 0..20 {
            let result = calculate_backwards_schedule(ScheduleRequest {
                tasks: request.tasks.clone(),
                anchors: request.anchors.clone(),
            })
            .expect("Schedule failed");

            let task_a = result.iter().find(|t| t.id == "a").unwrap();

            // Check if it respected the tighter constraint
            assert!(
                task_a.end_date.contains("2026-01-09"),
                "Task A end_date was {}, expected 2026-01-09",
                task_a.end_date
            );
        }
    }

    #[test]
    fn test_empty_project() {
        let request = ScheduleRequest {
            tasks: vec![],
            anchors: HashMap::new(),
        };

        let result = calculate_backwards_schedule(request).expect("Should handle empty project");
        assert!(result.is_empty());
    }
}
