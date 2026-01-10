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
- [ ] Task details popup (duration, dependencies, dates)
- [ ] Dependency chain preview

### Zoom Controls
Week/Month view for long projects.
- [ ] Zoom slider or buttons
- [ ] Fit-to-view option
- [ ] Persist zoom preference

## 📝 Wishlist

### The Simulation Approach (Desktop "Widgets")
If we want a "widget" that floats on the desktop (similar to Rainmeter or old-school dashboard widgets), it might be much easier to simulate this by creating a specialized Tauri window.

#### Step 1: Configure the Window
In your tauri.conf.json, you can define a window that is transparent, has no borders, and doesn't show up in the dock.

```JSON
{
  "tauri": {
    "windows": [
      {
        "label": "widget",
        "url": "index.html",
        "transparent": true,
        "decorations": false,
        "skipTaskbar": true,
        "alwaysOnTop": false,
        "resizable": false
      }
    ],
    "macosPrivateApi": true 
  }
}
```
Note: macosPrivateApi is often needed for advanced transparency/vibrancy effects.

#### Step 2: Stick it to the Desktop
To make it feel like a real widget that sits behind your windows but above the wallpaper, you can use the community plugin tauri-plugin-desktop-underlay. This plugin allows you to:

Pin the window to the desktop level.

Ensure it stays visible when you use "Show Desktop" (Exposé).

#### Step 3: Add Visual Polish
To get that "frosted glass" macOS look, use a vibrancy plugin or the newer tauri-plugin-liquid-glass.

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
- [ ] Save/load projects
- [ ] Export to JSON/CSV
- [ ] Undo/redo support

---

## 🧪 Experimental Ideas

- **AI task breakdown** — Auto-suggest subtasks from a goal
- **Time estimation** — Learn from past projects
- **Team collaboration** — Multi-user scheduling
- **Calendar sync** — Import/export to Google Calendar, etc.
