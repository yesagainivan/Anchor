# Anchor Roadmap

A backwards scheduling app that works from your deadline, not from today.

## ✅ Completed

- [x] **Core scheduling engine** — Rust-based backwards scheduler
- [x] **Task management** — Add, remove, set dependencies
- [x] **Anchor system** — Pin tasks to specific dates
- [x] **Timeline view** — Visual Gantt-style display
- [x] **Calendar view** — Drag-and-drop rescheduling
- [x] **Dark mode** — Full theme support
- [x] **Show Today toggle** — Buffer zone visualization
- [x] **Auto-recalculation** — No manual "Calculate" button needed

---

## 🔥 High Priority

### Progress Tracking
Mark tasks as complete, see overall project completion percentage.
- [ ] Add `completed` field to tasks
- [ ] Checkbox UI in task list
- [ ] Completion % in timeline header
- [ ] Visual distinction for completed tasks

### Critical Path Highlighting
Show which tasks can't slip without delaying the deadline.
- [ ] Calculate critical path in scheduler
- [ ] Highlight critical tasks in timeline
- [ ] Show slack time for non-critical tasks

---

## ⭐ Medium Priority

### Hover Cards
Rich detail on hover without clutter.
- [ ] Task details popup (duration, dependencies, dates)
- [ ] Dependency chain preview

### Zoom Controls
Week/Month view for long projects.
- [ ] Zoom slider or buttons
- [ ] Fit-to-view option
- [ ] Persist zoom preference

---

## 💡 Nice to Have

### Milestone Markers
Visual celebration of key dates.
- [ ] Mark tasks as milestones
- [ ] Diamond/flag markers on timeline

### Keyboard Shortcuts
Power user efficiency.
- [ ] `→/←` to scroll timeline
- [ ] `+/-` to zoom
- [ ] `N` for new task

### Data Persistence
- [ ] Save/load projects
- [ ] Export to JSON/CSV
- [ ] Undo/redo support

---

## 🧪 Experimental Ideas

- **AI task breakdown** — Auto-suggest subtasks from a goal
- **Time estimation** — Learn from past projects
- **Team collaboration** — Multi-user scheduling
- **Calendar sync** — Import/export to Google Calendar, etc.
