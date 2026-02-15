/// <reference types="chrome"/>

import { SecurityScanner } from './securityScanner.ts';

export class ConsoleMonitor {
    private static originalError: any;
    private static originalWarn: any;
    private static active = false;

    static enable() {
        if (this.active) return;
        this.active = true;

        // Capture current console methods (might already be wrapped)
        this.originalError = console.error.bind(console);
        this.originalWarn = console.warn.bind(console);

        // Override console.error
        const self = this;
        console.error = function (...args: any[]) {
            self.originalError(...args);
            self.report('console_error', 'high', args);
        };

        // Override console.warn  
        console.warn = function (...args: any[]) {
            self.originalWarn(...args);
            self.report('console_error', 'medium', args);
        };
    }

    static disable() {
        if (!this.active) return;
        this.active = false;
        console.error = this.originalError;
        console.warn = this.originalWarn;
    }

    private static report(type: 'console_error', severityHint: 'high' | 'medium', args: any[]) {
        try {
            const message = args.map(a => {
                try {
                    return (typeof a === 'object') ? JSON.stringify(a) : String(a);
                } catch {
                    return '[Circular/Unserializable]';
                }
            }).join(' ');

            // Security scan
            SecurityScanner.checkConsoleOutput(message);

            const stackInfo = new Error().stack;

            // Parse stack to get file/line
            // Line 1 is 'Error', Line 2 is this function, Line 3 is the caller
            // Simple regex attempt
            // at Object.console.error (consoleMonitor.ts:15)
            // at caller (app.js:20)

            const stackLines = stackInfo?.split('\n') || [];
            const callerLine = stackLines[3] || stackLines[2] || '';

            // Attempt to extract file/line
            const match = callerLine.match(/\((.*):(\d+):(\d+)\)/) || callerLine.match(/at\s+(.*):(\d+):(\d+)/);
            const file = match ? match[1] : '';
            const line = match ? parseInt(match[2]) : 0;
            const column = match ? parseInt(match[3]) : 0;

            chrome.runtime.sendMessage({
                action: 'TELEMETRY_EVENT',
                payload: {
                    type,
                    message: message.substring(0, 1000), // Truncate
                    url: window.location.href,
                    file,
                    line,
                    column,
                    stackTrace: stackInfo,
                    metadata: { severityHint } // Pass hint if needed, or rely on type
                    // Actually, my interface Issue doesn't have a 'level_hint', but the SeverityEngine can look at metadata.
                }
            });
        } catch (e) {
            // Prevent recursive errors
        }
    }
}
