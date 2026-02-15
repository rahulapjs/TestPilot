/// <reference types="chrome"/>

/**
 * This script runs in the "Main World" (page context) to intercept
 * console logs and network requests that the content script can't see.
 */

(function () {
    const originalConsoleError = console.error.bind(console);
    const originalConsoleWarn = console.warn.bind(console);
    const originalConsoleLog = console.log.bind(console);
    const originalConsoleInfo = console.info.bind(console);
    const originalFetch = window.fetch.bind(window);
    const originalXHR = window.XMLHttpRequest;

    function emit(type: string, data: any) {
        window.postMessage({
            source: 'testpilot-bridge',
            type,
            data
        }, '*');
    }

    // Console Interception
    console.error = function (...args: any[]) {
        originalConsoleError(...args);
        emit('console_error', {
            level: 'high',
            args: args.map(a => String(a))
        });
    };

    console.warn = function (...args: any[]) {
        originalConsoleWarn(...args);
        emit('console_error', {
            level: 'medium',
            args: args.map(a => String(a))
        });
    };

    console.log = function (...args: any[]) {
        originalConsoleLog(...args);
        emit('console_log', {
            level: 'low',
            args: args.map(a => String(a))
        });
    };

    console.info = function (...args: any[]) {
        originalConsoleInfo(...args);
        emit('console_log', {
            level: 'low',
            args: args.map(a => String(a))
        });
    };

    // Fetch Interception
    window.fetch = async (...args) => {
        const startTime = Date.now();
        let url = '';
        let method = 'GET';

        try {
            if (typeof args[0] === 'string') {
                url = args[0];
            } else if (args[0] instanceof URL) {
                url = args[0].href;
            } else if (args[0] instanceof Request) {
                url = args[0].url;
                method = args[0].method;
            }

            if (args[1] && args[1].method) {
                method = args[1].method;
            }

            const response = await originalFetch(...args);
            const duration = Date.now() - startTime;

            if (response.status >= 400 || duration > 1000) {
                emit('network_event', {
                    url,
                    method,
                    status: response.status,
                    duration
                });
            }

            return response;
        } catch (error) {
            emit('network_error', {
                url,
                method,
                message: (error as Error).message
            });
            throw error;
        }
    };

    // XHR Interception
    window.XMLHttpRequest = class extends originalXHR {
        private _method?: string;
        private _url?: string;
        private _startTime?: number;

        open(method: string, url: string | URL, ...args: any[]) {
            this._method = method;
            this._url = url.toString();
            this._startTime = Date.now();
            return (super.open as any)(method, url, ...args);
        }

        send(body?: Document | XMLHttpRequestBodyInit | null) {
            this.addEventListener('load', () => {
                const duration = Date.now() - (this._startTime || 0);
                if (this.status >= 400 || duration > 1000) {
                    emit('network_event', {
                        url: this._url,
                        method: this._method,
                        status: this.status,
                        duration
                    });
                }
            });
            this.addEventListener('error', () => {
                emit('network_error', {
                    url: this._url,
                    method: this._method,
                    message: 'XHR Error'
                });
            });
            return super.send(body);
        }
    } as any;

    // Runtime Errors
    window.addEventListener('error', (event) => {
        emit('runtime_error', {
            message: event.message,
            file: event.filename,
            line: event.lineno,
            column: event.colno,
            stack: event.error?.stack
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        emit('runtime_error', {
            message: String(event.reason?.message || event.reason),
            stack: event.reason?.stack,
            isPromise: true
        });
    });

    // SPA Route Change Tracking
    const wrapHistory = (method: string) => {
        const original = (history as any)[method];
        return function (this: History, ...args: any[]) {
            const result = original.apply(this, args);
            emit('route_change', {
                url: window.location.href,
                method,
                title: args[0]
            });
            return result;
        };
    };
    history.pushState = wrapHistory('pushState');
    history.replaceState = wrapHistory('replaceState');
    window.addEventListener('popstate', () => {
        emit('route_change', {
            url: window.location.href,
            method: 'popstate'
        });
    });

    // Performance: Long Task Detection
    if ('PerformanceObserver' in window) {
        try {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.duration > 200) { // Threshold: 200ms
                        emit('long_task', {
                            duration: entry.duration,
                            name: entry.name,
                            startTime: entry.startTime
                        });
                    }
                });
            });
            observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
            console.warn('[TestPilot] PerformanceObserver not supported for longtask');
        }
    }

    // Broken Resource Detection
    window.addEventListener('error', (event) => {
        if (event.target && (event.target instanceof HTMLImageElement || event.target instanceof HTMLScriptElement || event.target instanceof HTMLLinkElement)) {
            emit('resource_failure', {
                tagName: (event.target as HTMLElement).tagName,
                url: (event.target as any).src || (event.target as any).href,
                outerHTML: (event.target as HTMLElement).outerHTML
            });
        }
    }, true); // Use capture to catch resource errors

    // Storage Leak Detection (Optional but Powerful)
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
        // Simple regex for potentially sensitive data
        if (/(token|password|api[_-]?key|jwt|auth)/i.test(key) ||
            /(eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+)/.test(value)) {
            emit('security_risk', {
                type: 'storage_leak',
                key,
                value: value.length > 20 ? value.substring(0, 20) + '...' : value
            });
        }
        return originalSetItem.apply(this, [key, value]);
    };

    const context = window.self === window.top ? 'Main Window' : 'IFrame';
    console.log(`[TestPilot] Injected bridge active in ${context} with Advanced Monitoring`);
})();
