/// <reference types="chrome"/>

import type { Session } from '../core/types.ts';

const STORAGE_KEYS = {
    SESSIONS: 'sessions',
    CURRENT_SESSION_ID: 'currentSessionId',
};

export class StorageService {
    static async get<T>(key: string): Promise<T | undefined> {
        const result = await chrome.storage.local.get(key);
        return result[key] as T | undefined;
    }

    static async set(key: string, value: any): Promise<void> {
        await chrome.storage.local.set({ [key]: value });
    }

    static async getCurrentSessionId(): Promise<string | undefined> {
        return this.get<string>(STORAGE_KEYS.CURRENT_SESSION_ID);
    }

    static async setCurrentSessionId(id: string | null): Promise<void> {
        if (id === null) {
            await chrome.storage.local.remove(STORAGE_KEYS.CURRENT_SESSION_ID);
        } else {
            await this.set(STORAGE_KEYS.CURRENT_SESSION_ID, id);
        }
    }

    static async getSession(sessionId: string): Promise<Session | undefined> {
        const sessions = await this.get<Record<string, Session>>(STORAGE_KEYS.SESSIONS) || {};
        return sessions[sessionId];
    }

    static async saveSession(session: Session): Promise<void> {
        const sessions = await this.get<Record<string, Session>>(STORAGE_KEYS.SESSIONS) || {};
        sessions[session.sessionId] = session;
        await this.set(STORAGE_KEYS.SESSIONS, sessions);
    }

    static async getAllSessions(): Promise<Record<string, Session>> {
        return (await this.get<Record<string, Session>>(STORAGE_KEYS.SESSIONS)) || {};
    }

    static async clearAll(): Promise<void> {
        await chrome.storage.local.clear();
    }
}
