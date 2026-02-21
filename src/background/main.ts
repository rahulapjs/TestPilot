/// <reference types="chrome"/>

import { SessionManager } from './sessionManager.ts';
import { EventProcessor } from './eventProcessor.ts';

// Listen for messages from Content Script or Popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'TELEMETRY_EVENT') {
        EventProcessor.processEvent(message.payload);
    } else if (message.action === 'GET_SESSION_STATUS') {
        SessionManager.getCurrentSession().then((session) => {
            sendResponse({ active: !!session, config: session?.config });
        });
        return true; // async
    } else if (message.action === 'START_SESSION') {
        SessionManager.startSession(message.payload).then((session) => {
            notifyTabs('SESSION_STARTED', { config: session.config });
            sendResponse({ session });
        });
        return true;
    } else if (message.action === 'STOP_SESSION') {
        SessionManager.endSession().then((session) => {
            notifyTabs('SESSION_STOPPED', { session });
            sendResponse({ session });
        });
        return true;
    }
});

async function notifyTabs(action: string, payload?: any) {
    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
        if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action, ...payload }).catch(() => { });
        }
    });
}

// Initialize
chrome.runtime.onInstalled.addListener(() => {
    // Extension installed
});
