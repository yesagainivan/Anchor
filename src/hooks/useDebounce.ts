import { useState, useEffect } from 'react';

/**
 * Debounces a value by delaying updates until the value stops changing for the specified delay.
 * This is the correct pattern for autosave: debounce the DATA, then react to changes.
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}
