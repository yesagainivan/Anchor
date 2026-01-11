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
- [x] **Desktop Widget (Alpha)** — Simluated floating window (Currently using mock data)
- [/] **Logo & Branding** — Designing application identity


---

## 🔥 High Priority

### Progress Tracking
Mark tasks as complete, see overall project completion percentage.
- [x] Add `completed` field to tasks
- [x] Checkbox UI in task list
- [x] Completion % in timeline header
- [x] Visual distinction for completed tasks

### Critical Path Highlighting
Show which tasks can't slip without delaying the deadline.
- [x] Calculate critical path in scheduler
- [x] Highlight critical tasks in timeline
- [x] Show slack time for non-critical tasks

---

## ⭐ Medium Priority

### Hover Cards
Rich detail on hover without clutter.
- [x] Task details popup (duration, dependencies, dates)
- [x] Dependency chain preview

### Zoom Controls
Week/Month view for long projects.
- [x] Zoom slider or buttons
- [x] Fit-to-view option
- [x] Persist zoom preference

## 📝 Wishlist

### Widget Data Connection
Connect the simulated desktop widget to real backend data.
- [x] Implement query command for "Next Deadline"
- [x] Auto-refresh logic on widget focus
- [x] Shared state management between main app and widget (Event-Driven)

#### Option B: Native Widget (WidgetKit) Might consider this in the future but currently not a priority
**Pros:** Best user experience, native integration (Notification Center, Desktop in Sonoma+), battery efficient.
**Cons:** Requires Swift/SwiftUI, limited interactivity (toggles/buttons only), complex data sharing (App Groups).

**Implementation:**
1. Add a Widget Extension target in Xcode.
2. Use `tauri-plugin-store` or shared JSON files in an App Group to sync data between Rust core and the Swift widget.
3. Use `reloadAllTimelines` to refresh data.

### System Tray & Lifecycle
- [x] Run in background (Close hides window)
- [x] System Tray menu (Show/Quit)
- [x] Widget Tabs (Focus vs Up Next)


---

## 💡 Nice to Have

### Add a note system for tasks 
*to be designed*

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
- [x] Save/load projects (JSON-based)
- [ ] Export to JSON/CSV
- [ ] Undo/redo support

---

## 🧪 Experimental Ideas

- **AI task breakdown** — Auto-suggest subtasks from a goal
- **Time estimation** — Learn from past projects
- **Team collaboration** — Multi-user scheduling
- **Calendar sync** — Import/export to Google Calendar, etc.
