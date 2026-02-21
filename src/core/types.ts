export type IssueType =
    | 'runtime_crash'
    | 'console_error'
    | 'console_log'
    | 'network_failure'
    | 'slow_api'
    | 'retry_storm'
    | 'resource_failure'
    | 'cors_failure'
    | 'security_risk'
    | 'white_screen';

export type IssueLevel = 'critical' | 'high' | 'medium' | 'low';

export interface Issue {
    id: string;
    fingerprint: string;
    sessionId: string;
    type: IssueType;
    level: IssueLevel;
    message: string;
    file?: string;
    line?: number;
    column?: number;
    stackTrace?: string;
    url: string;
    metadata?: Record<string, any>;
    occurrences: number;
    firstSeen: number;
    lastSeen: number;
}

export interface Session {
    sessionId: string;
    startTime: number;
    endTime?: number;
    issues: Issue[];
    metadata?: {
        userAgent: string;
        viewport: { width: number; height: number };
        url: string;
        platform: string;
    };
    config?: {
        slowApiThreshold: number;
        escalationThreshold: number;
        enabledTypes: Record<IssueType, boolean>;
    };
}

export type SessionStatus = 'idle' | 'recording';

export interface StorageSchema {
    currentSessionId?: string;
    sessions: Record<string, Session>;
}
