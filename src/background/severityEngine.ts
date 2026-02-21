import type { IssueType, IssueLevel } from '../core/types.ts';

export class SeverityEngine {
    static determineLevel(type: IssueType, status?: number): IssueLevel {
        switch (type) {
            case 'runtime_crash':
            case 'white_screen':
            case 'retry_storm':
            case 'cors_failure':
            case 'security_risk':
                return 'critical';

            case 'network_failure':
                if (status && status >= 500) return 'critical';
                return 'high';

            case 'console_error':
            case 'resource_failure':
                return 'high';

            case 'slow_api':
                return 'medium';

            case 'console_log':
                return 'low';

            default:
                return 'low';
        }
    }

    static enrichLevel(level: IssueLevel, occurrences: number, threshold: number = 10): IssueLevel {
        if (occurrences >= threshold) {
            if (level === 'low') return 'medium';
            if (level === 'medium') return 'high';
            if (level === 'high') return 'critical';
        }
        return level;
    }
}
