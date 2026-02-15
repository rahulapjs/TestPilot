/// <reference types="chrome"/>

export class RuntimeMonitor {
    private static active = false;

    static enable() {
        if (this.active) return;
        this.active = true;
        window.addEventListener('error', this.handleError);
        window.addEventListener('unhandledrejection', this.handleRejection);
    }

    static disable() {
        if (!this.active) return;
        this.active = false;
        window.removeEventListener('error', this.handleError);
        window.removeEventListener('unhandledrejection', this.handleRejection);
    }

    private static handleError = (event: ErrorEvent) => {
        chrome.runtime.sendMessage({
            action: 'TELEMETRY_EVENT',
            payload: {
                type: 'runtime_crash',
                message: event.message,
                url: window.location.href,
                file: event.filename,
                line: event.lineno,
                column: event.colno,
                stackTrace: event.error?.stack
            }
        });
    };

    private static handleRejection = (event: PromiseRejectionEvent) => {
        let message = 'Unhandled Promise Rejection';
        let stack = '';

        if (event.reason instanceof Error) {
            message = event.reason.message;
            stack = event.reason.stack || '';
        } else {
            message = String(event.reason);
        }

        chrome.runtime.sendMessage({
            action: 'TELEMETRY_EVENT',
            payload: {
                type: 'runtime_crash',
                message: message,
                url: window.location.href,
                stackTrace: stack,
                metadata: { subType: 'promise_rejection' }
            }
        });
    };
}
