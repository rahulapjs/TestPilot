/// <reference types="chrome"/>

import { SessionManager } from './sessionManager.ts';
import { EventProcessor } from './eventProcessor.ts';
import { StorageService } from './storage.ts';

// Listen for messages from Content Script or Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'TELEMETRY_EVENT') {
        // Only accept telemetry from the tab that owns the session
        StorageService.getCurrentTabId().then((ownedTabId) => {
            if (sender.tab?.id === ownedTabId) {
                EventProcessor.processEvent(message.payload);
            }
        });

    } else if (message.action === 'GET_SESSION_STATUS') {
        // Only return active=true to the tab that owns the session
        Promise.all([
            SessionManager.getCurrentSession(),
            StorageService.getCurrentTabId()
        ]).then(([session, ownedTabId]) => {
            const isOwnerTab = sender.tab?.id === ownedTabId;
            sendResponse({
                active: !!session && isOwnerTab,
                config: (!!session && isOwnerTab) ? session.config : undefined
            });
        });
        return true; // async

    } else if (message.action === 'START_SESSION') {
        // tabId is sent by the popup, which queries the active tab before sending
        const tabId: number | undefined = message.payload?.tabId;
        SessionManager.startSession(message.payload).then(async (session) => {
            if (tabId) {
                await StorageService.setCurrentTabId(tabId);
                // Only notify the single target tab
                chrome.tabs.sendMessage(tabId, {
                    action: 'SESSION_STARTED',
                    config: session.config
                }).catch(() => { });
            }
            sendResponse({ session });
        });
        return true;

    } else if (message.action === 'STOP_SESSION') {
        StorageService.getCurrentTabId().then((tabId) => {
            SessionManager.endSession().then(async (session) => {
                await StorageService.setCurrentTabId(null);
                // Only notify the tab that owned the session
                if (tabId) {
                    chrome.tabs.sendMessage(tabId, {
                        action: 'SESSION_STOPPED'
                    }).catch(() => { });
                }
                sendResponse({ session });
            });
        });
        return true;
    }
});

// Initialize
chrome.runtime.onInstalled.addListener(() => {
    // Extension installed
});
