import { Select } from './Select';

export type DurationUnit = 'minutes' | 'hours' | 'days';

interface DurationPickerProps {
    value: number; // In user-selected units
    unit: DurationUnit;
    onChange: (value: number, unit: DurationUnit) => void;
    className?: string;
}

export function DurationPicker({ value, unit, onChange, className = '' }: DurationPickerProps) {
    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value) || 0;
        onChange(Math.max(1, val), unit);
    };

    const handleUnitChange = (newUnit: DurationUnit) => {
        onChange(value, newUnit);
    };

    const options: { value: DurationUnit; label: string }[] = [
        { value: 'minutes', label: 'Minutes' },
        { value: 'hours', label: 'Hours' },
        { value: 'days', label: 'Days' },
    ];

    return (
        <div className={`flex items-center ${className}`}>
            <div className="flex-1 relative group">
                <input
                    type="number"
                    min="1"
                    value={value}
                    onChange={handleValueChange}
                    className="w-full bg-surface border border-r-0 border-border rounded-l-lg py-2 px-3 text-sm text-text focus:border-brand focus:ring-1 focus:ring-brand focus:z-10 outline-none transition-all"
                />
            </div>
            <div className="w-[110px] min-w-[100px]">
                <Select
                    value={unit}
                    options={options}
                    onChange={(val) => handleUnitChange(val as DurationUnit)}
                    className="rounded-l-none rounded-r-lg -ml-px"
                />
            </div>
        </div>
    );
}
