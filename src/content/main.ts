/// <reference types="chrome"/>

// import { SecurityScanner } from './securityScanner.ts'; // deferred

// Content Script Loaded

// Always listen for bridge messages, regardless of when it's injected
window.addEventListener('message', (event) => {
    if (event.data?.source === 'testpilot-bridge') {
        const { type, data } = event.data;
        handleBridgeEvent(type, data);
    }
});

function injectBridge() {
    if (document.getElementById('testpilot-bridge')) return;
    const script = document.createElement('script');
    script.id = 'testpilot-bridge';
    script.src = chrome.runtime.getURL('src/bridge/bridge.js');
    (document.head || document.documentElement).appendChild(script);
}

let isMonitoring = false;

function handleBridgeEvent(type: string, data: any) {
    if (!isMonitoring) return;

    console.log(`[TestPilot] Bridge event received: ${type}`);

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
                chrome.runtime.sendMessage({
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
    } else if (type === 'long_task') {
        payload.type = 'long_task';
        payload.message = `UI Thread frozen for ${Math.round(data.duration)}ms`;
        payload.metadata = data;
    } else if (type === 'resource_failure') {
        payload.type = 'resource_failure';
        payload.message = `Failed to load ${data.tagName}: ${data.url}`;
        payload.metadata = data;
    } else if (type === 'route_change') {
        payload.type = 'route_change';
        payload.message = `Navigation: ${data.method} to ${data.url}`;
        payload.metadata = data;
    }

    chrome.runtime.sendMessage({ action: 'TELEMETRY_EVENT', payload });
}

function enableMonitors() {
    isMonitoring = true;
    injectBridge();
}

function disableMonitors() {
    isMonitoring = false;
}

// 1. Check initial state
chrome.runtime.sendMessage({ action: 'GET_SESSION_STATUS' }, (response: any) => {
    if (chrome.runtime.lastError) return;
    if (response && response.active) {
        enableMonitors();
    }
});

// 2. Listen for Command changes
chrome.runtime.onMessage.addListener((message: any) => {
    if (message.action === 'SESSION_STARTED') {
        enableMonitors();
    } else if (message.action === 'SESSION_STOPPED') {
        disableMonitors();
        // Session ended - check popup for report
    }
});
