/// <reference types="chrome"/>

export class NetworkMonitor {
    private static active = false;
    private static originalFetch = window.fetch;
    private static originalXHR = window.XMLHttpRequest;

    static enable() {
        if (this.active) return;
        this.active = true;

        // Fetch Override
        window.fetch = async (...args) => {
            const startTime = Date.now();
            const url = args[0].toString();
            const options = args[1] || {};
            const method = options.method || 'GET';

            try {
                const response = await this.originalFetch(...args);
                const duration = Date.now() - startTime;

                this.checkNetworkIssue(url, method, response.status, duration);

                return response;
            } catch (error) {
                // Network Failure (DNS, Offline, etc)
                this.reportFailure(url, method, (error as Error).message);
                throw error;
            }
        };

        // XHR Override (Simplified)
        // Complex to fully proxy XHR, sticking to Fetch for V1 as most modern apps use Fetch
        // But requirement says "Wrap window.fetch AND XMLHttpRequest"
        // I will implement a basic listener for XHR load events.

        // ... XHR logic requires prototype patching ...
        const self = this;
        window.XMLHttpRequest = class extends this.originalXHR {
            open(method: string, url: string | URL) {
                this._method = method;
                this._url = url.toString();
                this._startTime = Date.now();
                super.open(method, url);
            }

            send(body?: Document | XMLHttpRequestBodyInit | null) {
                this.addEventListener('load', () => {
                    const duration = Date.now() - (this._startTime || 0);
                    self.checkNetworkIssue(this._url || '', this._method || 'GET', this.status, duration);
                });
                this.addEventListener('error', () => {
                    self.reportFailure(this._url || '', this._method || 'GET', 'XHR Error');
                });
                super.send(body);
            }

            // Private fields for tracking
            private _method?: string;
            private _url?: string;
            private _startTime?: number;
        } as any;
    }

    static disable() {
        if (!this.active) return;
        this.active = false;
        window.fetch = this.originalFetch;
        window.XMLHttpRequest = this.originalXHR;
    }

    private static checkNetworkIssue(url: string, method: string, status: number, duration: number) {
        // 1. Check Slow API
        if (duration > 3000) {
            chrome.runtime.sendMessage({
                action: 'TELEMETRY_EVENT',
                payload: {
                    type: 'slow_api',
                    message: `Slow request to ${url} (${duration}ms)`,
                    url: window.location.href,
                    metadata: { method, status, duration, endpoint: url }
                }
            });
        }

        // 2. Check Errors (4xx, 5xx)
        if (status >= 400) {
            chrome.runtime.sendMessage({
                action: 'TELEMETRY_EVENT',
                payload: {
                    type: 'network_failure',
                    message: `HTTP ${status} on ${method} ${url}`,
                    url: window.location.href,
                    metadata: { method, status, duration, endpoint: url }
                }
            });
        }
    }

    private static reportFailure(url: string, method: string, errorMsg: string) {
        chrome.runtime.sendMessage({
            action: 'TELEMETRY_EVENT',
            payload: {
                type: 'network_failure',
                message: `Network Error: ${errorMsg}`,
                url: window.location.href,
                metadata: { method, endpoint: url }
            }
        });
    }
}
