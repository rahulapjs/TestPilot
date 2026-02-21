/// <reference types="chrome"/>

// import { SecurityScanner } from './securityScanner.ts'; // deferred

// Content Script Loaded

// Helper to safely send messages to background
function safeSendMessage(message: any, callback?: (response: any) => void) {
    try {
        if (chrome.runtime?.id) {
            if (callback) {
                chrome.runtime.sendMessage(message, (response) => {
                    if (chrome.runtime.lastError) {
                        // Context likely invalidated, ignore
                        return;
                    }
                    callback(response);
                });
            } else {
                chrome.runtime.sendMessage(message).catch(() => {
                    // Context likely invalidated, ignore
                });
            }
        }
    } catch (e) {
        // Extension context invalidated, ignore
    }
}

// Always listen for bridge messages, regardless of when it's injected
window.addEventListener('message', (event) => {
    if (event.data?.source === 'testpilot-bridge') {
        const { type, data } = event.data;
        handleBridgeEvent(type, data);
    }
});

function injectBridge() {
    if (document.getElementById('testpilot-bridge')) return;
    try {
        if (!chrome.runtime?.id) return;
        const script = document.createElement('script');
        script.id = 'testpilot-bridge';
        script.src = chrome.runtime.getURL('src/bridge/bridge.js');
        (document.head || document.documentElement).appendChild(script);
    } catch (e) {
        // Context invalidated
    }
}

let isMonitoring = false;
let sessionConfig: any = null;

function handleBridgeEvent(type: string, data: any) {
    if (!isMonitoring) return;

    // Filter by type if config is available
    if (sessionConfig?.enabledTypes) {
        // Map common internal types to IssueType if they differ
        let issueType: string = type;
        if (type === 'network_event' || type === 'network_error') {
            const isError = type === 'network_error' || (data.status && data.status >= 400);
            issueType = isError ? 'network_failure' : 'slow_api';
        } else if (type === 'runtime_error') {
            issueType = 'runtime_crash';
        } else if (type === 'resource_failure') {
            issueType = 'resource_failure';
        } else if (type === 'security_risk') {
            issueType = 'security_risk';
        }

        if (sessionConfig.enabledTypes[issueType] === false) {
            return;
        }
    }

    let payload: any = {
        type,
        url: window.location.href,
        metadata: data.metadata || {}
    };

    if (type === 'console_error' || type === 'console_log') {
        payload.type = type;
        payload.message = data.args.join(' ');
        payload.metadata.severityHint = data.level;

        // Security Leak Detection
        if (/(token|password|password|api[_-]?key|jwt|auth)/i.test(payload.message)) {
            payload.type = 'security_risk';
            payload.message = `Possible sensitive data leak in console: ${payload.message.substring(0, 50)}...`;
        }
    } else if (type === 'network_event' || type === 'network_error') {
        const isError = type === 'network_error' || (data.status && data.status >= 400);
        const isCors = data.message?.includes('CORS') || data.message?.includes('Blocked by policy');

        payload.type = isCors ? 'cors_failure' : (isError ? 'network_failure' : 'slow_api');

        const prefix = isCors ? 'CORS Error' : (isError ? `HTTP ${data.status || 'Error'}` : `Slow API (${data.duration}ms)`);
        payload.message = data.message || `${prefix} on ${data.method} ${data.url}`;
        payload.metadata = { ...payload.metadata, ...data };
    } else if (type === 'runtime_error') {
        payload.type = 'runtime_crash';
        payload.message = data.message;
        payload.stackTrace = data.stack;

        // White Screen Detection
        setTimeout(() => {
            const contentLen = document.body?.innerText?.length || 0;
            if (contentLen < 50) {
                safeSendMessage({
                    action: 'TELEMETRY_EVENT',
                    payload: {
                        type: 'white_screen',
                        message: 'Potential white screen detected after runtime crash.',
                        url: window.location.href,
                        metadata: { contentSize: contentLen }
                    }
                });
            }
        }, 1000);

    } else if (type === 'resource_failure') {
        payload.type = 'resource_failure';
        payload.message = `Failed to load ${data.tagName}: ${data.url}`;
        payload.metadata = data;

    } else if (type === 'security_risk') {
        payload.type = 'security_risk';
        // data from bridge: { type: 'storage_leak', key, value }
        if (data.type === 'storage_leak') {
            payload.message = `Sensitive key written to localStorage: "${data.key}"`;
        } else {
            payload.message = `Security risk detected in page context`;
        }
        payload.metadata = { ...data };
    }

    safeSendMessage({ action: 'TELEMETRY_EVENT', payload });
}

function enableMonitors(config?: any) {
    isMonitoring = true;
    sessionConfig = config;
    injectBridge();
}

function disableMonitors() {
    isMonitoring = false;
    sessionConfig = null;
}

// 1. Check initial state
safeSendMessage({ action: 'GET_SESSION_STATUS' }, (response: any) => {
    if (response && response.active) {
        enableMonitors(response.config);
    }
});

// 2. Listen for Command changes
try {
    if (chrome.runtime?.id) {
        chrome.runtime.onMessage.addListener((message: any) => {
            if (message.action === 'SESSION_STARTED') {
                enableMonitors(message.config);
            } else if (message.action === 'SESSION_STOPPED') {
                disableMonitors();
            }
        });
    }
} catch (e) {
    // Context invalidated
}
