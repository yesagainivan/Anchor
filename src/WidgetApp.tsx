import { useEffect } from "react";
// import { invoke } from "@tauri-apps/api/core";
// import { EVENT_REFRESH_DATA } from "../shared_constants"; // We might need shared constants later

function WidgetApp() {
    // const [deadline, setDeadline] = useState<string | null>("No Deadline Set");

    // Placeholder logic for now, will connect to Rust backend later
    useEffect(() => {
        // Sync theme with main app (basic check for now)
        // Check if "dark" theme is stored in localStorage or if system prefers dark
        const isDark = localStorage.getItem('anchor-theme') === 'dark' ||
            (!localStorage.getItem('anchor-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    return (
        <div
            className="h-screen w-screen bg-surface/40 rounded-2xl border border-border/10 p-4 text-text overflow-hidden flex flex-col items-center justify-center select-none cursor-default relative transition-colors duration-300"
            data-tauri-drag-region
        >
            <div className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1 pointer-events-none">
                Next Anchor
            </div>
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand-hover pb-1 pointer-events-none">
                Demo Project
            </div>
            <div className="text-sm font-medium mt-2 text-text/80 pointer-events-none">
                Due in 3 days
            </div>

            {/* Decorative timeline line */}
            <div className="w-full h-1 bg-border-muted mt-4 rounded-full overflow-hidden opacity-50 pointer-events-none">
                <div className="h-full bg-brand w-2/3 rounded-full" />
            </div>
        </div>
    );
}

export default WidgetApp;
