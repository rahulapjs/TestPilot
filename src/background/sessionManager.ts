import { StorageService } from './storage.ts';
import type { Session } from '../core/types.ts';

export class SessionManager {
    static async startSession(payload?: { envData?: any, config?: any }): Promise<Session> {
        const sessionId = crypto.randomUUID();
        const { envData, config } = payload || {};
        const session: Session = {
            sessionId,
            startTime: Date.now(),
            issues: [],
            metadata: envData || {
                userAgent: navigator.userAgent,
                viewport: { width: window.innerWidth, height: window.innerHeight },
                url: location.href,
                platform: (navigator as any).platform
            },
            config: config || {
                slowApiThreshold: 1000,
                escalationThreshold: 10,
                enabledTypes: {
                    runtime_crash: true,
                    console_error: true,
                    console_log: false,
                    network_failure: true,
                    slow_api: true,
                    retry_storm: true,
                    resource_failure: true,
                    cors_failure: true,
                    security_risk: true,
                    white_screen: true
                }
            }
        };
        await StorageService.saveSession(session);
        await StorageService.setCurrentSessionId(sessionId);
        return session;
    }

    static async endSession(): Promise<Session | null> {
        const sessionId = await StorageService.getCurrentSessionId();
        if (!sessionId) return null;

        const session = await StorageService.getSession(sessionId);
        if (session) {
            session.endTime = Date.now();
            await StorageService.saveSession(session);
        }
        await StorageService.setCurrentSessionId(null);
        return session || null;
    }

    static async isActive(): Promise<boolean> {
        const id = await StorageService.getCurrentSessionId();
        return !!id;
    }

    static async getCurrentSession(): Promise<Session | undefined> {
        const id = await StorageService.getCurrentSessionId();
        if (!id) return undefined;
        return StorageService.getSession(id);
    }
}
