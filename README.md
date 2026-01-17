# Anchor
> **Backwards scheduling from your deadline.**

![Anchor Banner](./assets/banner.webp)

Anchor is a retro-planning application designed to tell you *when to start*, not just when to finish. Unlike traditional calendars that push tasks forward, Anchor starts from your "Dead-Drop" deadline and calculates backwards, revealing the true critical path and available buffer time.

Built with **Tauri**, **React**, **Rust**, and **TypeScript** for high performance and a native feel.

> [!NOTE]
> This is a work in progress. The app is functional but isnt signed yet, so you'll need to bypass the security warning when installing.

##### Bypassing the security warning:
```bash
xattr -cr /Applications/Anchor.app
```
*This process should be entirely safe; checkout the source if you are worried.*


## Philosophy

Most project management tools are **forward-facing**: you pick a start date and hope you finish on time.
Anchor is **backward-facing**:
1.  **Set the Deadline**: The one non-negotiable date (e.g., Launch Day).
2.  **Define Tasks & Durations**: "Design takes 3 days", "Dev takes 5 days".
3.  **Link Dependencies**: "Dev cannot start until Design is finished".
4.  **See the Truth**: Anchor calculates exactly when you *must* start to hit that deadline.

If you miss a start date, the "Ripple Effect" immediately shows how your buffer has acted as a shield—or if your deadline is now in danger.

## Features

-   **⚓ Anchor System**: Pin tasks to specific dates. Everything else flows around them.
-   **🌊 Ripple Effect Scheduling**: Update any anchor or drag tasks in the **Calendar**, and watch the timeline automatically recalculate.
-   **🔥 Critical Path**: Instantly visualize which tasks are critical. Delaying these *will* delay the project.
-   **📅 Dual Views**:
    -   **Timeline**: A fluid Gantt-style view for high-level planning.
    -   **Calendar**: A familiar monthly view for dragging and rescheduling.
-   **🛡️ Project Buffer**: Visual "Safety Zone" shows exactly how much slack you have before you *must* start the project.
-   **💎 Milestones**: Visual celebration of key dates with diamond markers on the timeline.
-   **📝 Task Notes**: Add rich Markdown notes to any task to keep details contextually relevant.
-   **🌚 Dark Mode**: Fully themed UI that respects your system preferences.
-   **🧩 Desktop Widget**: (Alpha) A float-on-top widget with **Project Switching** and **Visual Progress** to keep your goal in focus.

## Tech Stack

-   **Core**: Rust (for the graph-based scheduling engine)
-   **Framework**: Tauri (v2)
-   **Frontend**: React + TypeScript + Vite
-   **Styling**: Tailwind CSS + CSS Modules
-   **State**: Custom React hooks backed by Rust commands

## Getting Started

### Prerequisites
-   Node.js & npm/pnpm
-   Rust (cargo)

### Development

1.  **Install dependencies**
    ```bash
    npm install
    ```

2.  **Run the app**
    ```bash
    npm run tauri dev
    ```

### Release
See [RELEASE.md](./RELEASE.md) for instructions on how to build and ship versioned releases.

## Roadmap

See [roadmap.md](./roadmap.md) for the active development plan.

---

*Designed with <3 by Ivan & Gemini.*
