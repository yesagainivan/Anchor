import { getCurrentWindow } from '@tauri-apps/api/window';
import { AnimatePresence, motion } from 'framer-motion';

interface TitleBarProps {
    title?: string;
}

export function TitleBar({ title = "Anchor" }: TitleBarProps) {
    const appWindow = getCurrentWindow();

    const handleClose = () => appWindow.close();
    const handleMinimize = () => appWindow.minimize();
    const handleMaximize = () => appWindow.toggleMaximize();

    return (
        <div className="title-bar" data-tauri-drag-region>
            {/* Traffic light buttons */}
            <div className="title-bar-controls">
                <button
                    className="traffic-light traffic-light-close"
                    onClick={handleClose}
                    title="Close"
                >
                    <svg viewBox="0 0 12 12" className="traffic-light-icon">
                        <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </button>
                <button
                    className="traffic-light traffic-light-minimize"
                    onClick={handleMinimize}
                    title="Minimize"
                >
                    <svg viewBox="0 0 12 12" className="traffic-light-icon">
                        <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </button>
                <button
                    className="traffic-light traffic-light-maximize"
                    onClick={handleMaximize}
                    title="Maximize"
                >
                    <svg viewBox="0 0 12 12" className="traffic-light-icon">
                        <path d="M3 3h6v6H3z" stroke="currentColor" strokeWidth="1.2" fill="none" />
                    </svg>
                </button>
            </div>

            {/* Title */}
            <div className="title-bar-title relative flex justify-center items-center h-full overflow-hidden w-full">
                <AnimatePresence mode="wait">
                    <motion.span
                        key={title}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                        className="absolute"
                    >
                        {title}
                    </motion.span>
                </AnimatePresence>
            </div>

            {/* Spacer for centering */}
            <div className="title-bar-spacer" />
        </div>
    );
}
