/// <reference types="chrome"/>

import { SessionManager } from './sessionManager.ts';
import { EventProcessor } from './eventProcessor.ts';

// Listen for messages from Content Script or Popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'TELEMETRY_EVENT') {
        EventProcessor.processEvent(message.payload);
    } else if (message.action === 'GET_SESSION_STATUS') {
        SessionManager.isActive().then((active) => {
            sendResponse({ active });
        });
        return true; // async
    } else if (message.action === 'START_SESSION') {
        const { envData } = message.payload || {};
        SessionManager.startSession(envData).then((session) => {
            notifyTabs('SESSION_STARTED');
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
