import { useState, useEffect, useRef } from 'react';

export type DurationUnit = 'minutes' | 'hours' | 'days';

interface SmartDurationInputProps {
    value: number; // Value in the specified unit
    unit: DurationUnit;
    onChange: (value: number, unit: DurationUnit) => void;
    className?: string;
    placeholder?: string;
}

export function SmartDurationInput({
    value,
    unit,
    onChange,
    className = '',
    placeholder = 'e.g. 1d, 4h, 30m'
}: SmartDurationInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Format the display string based on value and unit
    const formatDisplay = (val: number, u: DurationUnit) => {
        if (u === 'days') return `${val} day${val !== 1 ? 's' : ''}`;
        if (u === 'hours') return `${val} hour${val !== 1 ? 's' : ''}`;
        return `${val} minute${val !== 1 ? 's' : ''}`;
    };

    // Format the edit string (shorthand)
    const formatEdit = (val: number, u: DurationUnit) => {
        if (u === 'days') return `${val}d`;
        if (u === 'hours') return `${val}h`;
        return `${val}m`;
    };

    // Sync input value with props when not focused
    useEffect(() => {
        if (!isFocused) {
            setInputValue(formatDisplay(value, unit));
        }
    }, [value, unit, isFocused]);

    const handleFocus = () => {
        setIsFocused(true);
        setInputValue(formatEdit(value, unit));
        // Select all text on focus for easy replacement
        setTimeout(() => inputRef.current?.select(), 0);
    };

    const parseInput = (input: string) => {
        const text = input.trim().toLowerCase();

        // Match number and optional unit
        // Regex allows integer or float, followed by optional whitespace and unit char
        const match = text.match(/^(\d*(?:\.\d+)?)\s*([dhm])?$/);

        if (!match) {
            // If completely invalid or empty, revert to current value
            return { newVal: value, newUnit: unit };
        }

        const numStr = match[1];
        const unitChar = match[2];

        // If no number found (e.g. just "d"), ignore
        if (!numStr) {
            return { newVal: value, newUnit: unit };
        }

        let val = parseFloat(numStr);
        let newUnit = unit;

        if (isNaN(val) || val <= 0) val = 1;

        if (unitChar === 'd') {
            newUnit = 'days';
        } else if (unitChar === 'h') {
            newUnit = 'hours';
        } else if (unitChar === 'm') {
            newUnit = 'minutes';
        } else {
            // No unit specified, infer from current or commonly used logic
            // If user types '5', and last unit was days, keep days.
            newUnit = unit;
        }

        return { newVal: val, newUnit };
    };

    const handleBlur = () => {
        setIsFocused(false);
        const { newVal, newUnit } = parseInput(inputValue);

        // Only trigger change if different
        if (newVal !== value || newUnit !== unit) {
            onChange(newVal, newUnit);
        }

        // Reset input text to display format
        setInputValue(formatDisplay(newVal, newUnit));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            inputRef.current?.blur();
        }
    };

    return (
        <div className={`relative group ${className}`}>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`w-full bg-surface-alt border border-transparent rounded px-2 py-0.5 text-sm font-medium text-text text-center transition-all focus:bg-surface focus:border-brand focus:ring-1 focus:ring-brand focus:text-left outline-none cursor-pointer hover:bg-surface-alt/80 ${isFocused ? 'bg-surface border-brand cursor-text' : ''
                    }`}
                style={{ minWidth: '80px' }}
            />
            {/* Tooltip hint that appears on hover/focus could be added here if needed */}
        </div>
    );
}
