/// <reference types="chrome"/>

import { StorageService } from './storage.ts';
import type { IssueType } from '../core/types.ts';
import { SeverityEngine } from './severityEngine.ts';
import { createIssue } from '../core/issueFactory.ts';

export class EventProcessor {
    private static recentNetworkEvents: { url: string; status: number; time: number }[] = [];

    static async processEvent(event: any) {
        const sessionId = await StorageService.getCurrentSessionId();
        if (!sessionId) return;

        const session = await StorageService.getSession(sessionId);
        if (!session) return;

        // API Retry Storm Detection
        if (event.type === 'network_failure') {
            const now = Date.now();
            this.recentNetworkEvents = this.recentNetworkEvents.filter(e => now - e.time < 5000);
            const repeats = this.recentNetworkEvents.filter(e => e.url === event.metadata?.url && e.status === event.metadata?.status);

            if (repeats.length >= 3) {
                event.type = 'retry_storm';
                event.message = `API Retry Storm Detected: ${event.metadata?.url} failing repeatedly (${event.metadata?.status})`;
            }
            this.recentNetworkEvents.push({ url: event.metadata?.url, status: event.metadata?.status, time: now });
        }

        const type = event.type as IssueType;
        const initialLevel = SeverityEngine.determineLevel(type, event.metadata?.status);

        // Deduplicate using fingerprint (we need to create the candidate first to get the fingerprint)
        const candidate = createIssue(
            sessionId,
            type,
            initialLevel,
            event.message,
            event.url,
            {
                file: event.file,
                line: event.line,
                column: event.column,
                stackTrace: event.stackTrace,
                metadata: event.metadata
            }
        );

        const existingIndex = session.issues.findIndex((i) => i.fingerprint === candidate.fingerprint);

        if (existingIndex >= 0) {
            const issue = session.issues[existingIndex];
            issue.occurrences++;
            issue.lastSeen = Date.now();

            // Smart Severity Upgrade (Escalation)
            issue.level = SeverityEngine.enrichLevel(
                initialLevel,
                issue.occurrences,
                session.config?.escalationThreshold || 10
            );
        } else {
            session.issues.push(candidate);
        }

        await StorageService.saveSession(session);

        // Update Badge
        const issueCount = session.issues.length;
        chrome.action.setBadgeText({ text: issueCount > 0 ? issueCount.toString() : '' });
    }
}
