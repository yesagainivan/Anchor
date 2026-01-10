export type ProjectStatus = 'overdue' | 'urgent' | 'on_track' | 'empty';

export const URGENT_THRESHOLD_DAYS = 5;

export function getProjectStatus(daysLeft: number): ProjectStatus {
    if (daysLeft < 0) return 'overdue';
    if (daysLeft <= URGENT_THRESHOLD_DAYS) return 'urgent';
    return 'on_track';
}

export function getStatusColor(status: string): string {
    switch (status) {
        case 'on_track': return 'text-success';
        case 'urgent': return 'text-warning';
        case 'overdue': return 'text-danger';
        default: return 'text-text-muted';
    }
}

export function getStatusBgColor(status: string): string {
    switch (status) {
        case 'on_track': return 'bg-success';
        case 'urgent': return 'bg-warning';
        case 'overdue': return 'bg-danger';
        default: return 'bg-text-muted';
    }
}
