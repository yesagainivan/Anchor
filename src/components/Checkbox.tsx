import { CheckIcon } from './icons';

interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    label?: string;
    description?: string;
}

export function Checkbox({ checked, onChange, className = '', label, description }: CheckboxProps) {
    return (
        <label className={`flex items-start gap-3 cursor-pointer group select-none ${className}`}>
            <div className="relative flex items-center mt-0.5">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${checked
                        ? 'bg-brand border-brand text-white shadow-sm scale-110'
                        : 'bg-surface border-border-muted group-hover:border-brand shadow-sm'
                        }`}
                >
                    <CheckIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} />
                </div>
            </div>
            {(label || description) && (
                <div className="flex-1">
                    {label && <div className={`text-sm font-medium ${checked ? 'text-text' : 'text-text-muted group-hover:text-text'} transition-colors`}>{label}</div>}
                    {description && <div className="text-xs text-text-faint">{description}</div>}
                </div>
            )}
        </label>
    );
}
