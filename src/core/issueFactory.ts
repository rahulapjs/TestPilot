import type { Issue, IssueType, IssueLevel } from './types.ts';
import { generateFingerprint } from './fingerprint.ts';

export function createIssue(
    sessionId: string,
    type: IssueType,
    level: IssueLevel,
    message: string,
    url: string,
    details: {
        file?: string;
        line?: number;
        column?: number;
        stackTrace?: string;
        metadata?: Record<string, any>;
    } = {}
): Issue {
    const file = details.file || '';
    const line = details.line || 0;
    const now = Date.now();

    return {
        id: crypto.randomUUID(),
        fingerprint: generateFingerprint(message, file, line),
        sessionId,
        type,
        level,
        message,
        url,
        file,
        line,
        column: details.column,
        stackTrace: details.stackTrace,
        metadata: details.metadata,
        occurrences: 1,
        firstSeen: now,
        lastSeen: now,
    };
}
