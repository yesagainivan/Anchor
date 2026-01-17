# Recurring Tasks & Deadlines Implementation Plan (Deferred)

> [!NOTE]
> This feature has been deferred to v0.5.0 or v0.6.0.
> Original Plan Date: 2026-01-17

## User Review Required

> [!IMPORTANT]
> **Recurrence Strategy**: "Recurrence on Completion". When a recurring task is completed, a new instance is created immediately with the next due date.
> - **Anchors**: If the recurring task was an Anchor (deadline), the new instance will also be an Anchor, shifted by the recurrence interval.
> - **Dependencies**: The new instance will receive a **copy** of the dependencies of the original task only if those dependencies are also part of the recurrent chain (future enhancement). For now, **recurring tasks will spawn as independent tasks** (preserving name/duration/notes) unless we decide to clone the entire dependency tree. 
>   - *Recommendation*: For V1, recurring tasks spawn with **NO** dependencies to avoid complexity (shifting dependency dates is hard). This fits "Recurring Deadlines" (e.g., Weekly Report, Pay Bills).
>
> **Recurring Projects**: This plan focuses on task-level recurrence. Recurring Projects (cloning an entire project graph) are treated as a separate feature, though the underlying logic (cloning + time shifting) is similar.

## Proposed Changes

### Backend (Rust)

#### [MODIFY] [scheduler.rs](file:///Users/ivanowono/Documents/Code/Rusty/Apps/anchor/src-tauri/src/scheduler.rs)
- Update `Task` struct to include `recurrence: Option<String>`.
- Allowed values: `"daily"`, `"weekly"`, `"monthly"`, `"yearly"`. (Simple string for V1).

#### [MODIFY] [project.rs](file:///Users/ivanowono/Documents/Code/Rusty/Apps/anchor/src-tauri/src/project.rs)
- Update `Task` usage matching `scheduler.rs`.
- Implement `complete_task` logic (or update existing update logic) to check for recurrence.
- **New Function**: `check_recurrence_and_spawn(task: &Task, project: &mut Project)`
    - If task is completed and has recurrence:
        - Calculate next date.
        - Create `new_task` (clone of `task`, new ID, completed=false).
        - If `task.id` is in `project.anchors`:
            - Calculate `new_anchor_date` (old_date + interval).
            - Add `new_task.id` -> `new_anchor_date` to `project.anchors`.
        - Push `new_task` to `project.tasks`.
- Expose this logic via a Tauri command (e.g., `complete_task` or transparently in `save_project` if we can detect the transition).
    - *Better*: Add a specific `toggle_task_completion` command to handle this server-side logic properly. Currently `save_project` just saves the whole state, which makes "trigger on change" hard.
    - **Decision**: Create `complete_task(project_id, task_id)` command to handle logic safely.

### Frontend (TypeScript)

#### [MODIFY] [types.ts](file:///Users/ivanowono/Documents/Code/Rusty/Apps/anchor/src/types.ts)
- Add `recurrence?: string` to `Task` interface.

#### [MODIFY] [TaskForm.tsx](file:///Users/ivanowono/Documents/Code/Rusty/Apps/anchor/src/components/TaskForm.tsx)
- Add "Recurrence" dropdown/select: None, Daily, Weekly, Monthly.

#### [MODIFY] [TaskDetailsView.tsx](file:///Users/ivanowono/Documents/Code/Rusty/Apps/anchor/src/components/TaskDetailsView.tsx)
- Display recurrence status.
- Allow editing recurrence.

#### [New Command Integration] : `useProject` hook or similar
- Ensure that clicking "Complete" calls the new `toggle_task_completion` (or similar) command instead of just mutating local state and saving.
