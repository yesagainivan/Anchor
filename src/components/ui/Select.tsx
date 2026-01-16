import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '../icons';

interface SelectOption<T> {
    value: T;
    label: string;
}

interface SelectProps<T> {
    value: T;
    options: SelectOption<T>[];
    onChange: (value: T) => void;
    className?: string;
}

export function Select<T extends string | number>({ value, options, onChange, className = '' }: SelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedLabel = options.find(o => o.value === value)?.label || value;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-surface text-sm text-text border border-border rounded-lg hover:border-brand/50 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all ${className}`}
            >
                <span className="truncate">{selectedLabel}</span>
                <ChevronDownIcon className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-surface border border-border/50 rounded-lg shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                    <div className="max-h-60 overflow-auto p-1 custom-scrollbar">
                        {options.map((option) => (
                            <button
                                key={String(option.value)}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 text-sm rounded-md transition-colors ${option.value === value
                                    ? 'bg-brand/10 text-brand font-medium'
                                    : 'text-text hover:bg-surface-alt'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
