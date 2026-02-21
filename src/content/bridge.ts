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
        let requestBody: any = null;

        try {
            if (typeof args[0] === 'string') {
                url = args[0];
            } else if (args[0] instanceof URL) {
                url = args[0].href;
            } else if (args[0] instanceof Request) {
                url = args[0].url;
                method = args[0].method;
            }

            if (args[1]) {
                if (args[1].method) method = args[1].method;
                if (args[1].body) requestBody = args[1].body;
            }

            const response = await originalFetch(...args);
            const duration = Date.now() - startTime;

            if (response.status >= 400 || duration > 1000) {
                let responseBody = '';
                try {
                    const clone = response.clone();
                    responseBody = await clone.text();
                } catch (e) {
                    responseBody = '[Unable to read body]';
                }

                emit('network_event', {
                    url,
                    method,
                    status: response.status,
                    duration,
                    requestPayload: requestBody ? (typeof requestBody === 'string' ? requestBody : '[Non-string body]') : null,
                    responseBody: responseBody.substring(0, 2000)
                });
            }

            return response;
        } catch (error) {
            emit('network_error', {
                url,
                method,
                message: (error as Error).message,
                requestPayload: requestBody ? (typeof requestBody === 'string' ? requestBody : '[Non-string body]') : null
            });
            throw error;
        }
    };

    // XHR Interception
    window.XMLHttpRequest = class extends originalXHR {
        private _method?: string;
        private _url?: string;
        private _startTime?: number;
        private _requestBody?: any;

        open(method: string, url: string | URL, ...args: any[]) {
            this._method = method;
            this._url = url.toString();
            this._startTime = Date.now();
            return (super.open as any)(method, url, ...args);
        }

        send(body?: Document | XMLHttpRequestBodyInit | null) {
            this._requestBody = body;
            this.addEventListener('load', () => {
                const duration = Date.now() - (this._startTime || 0);
                if (this.status >= 400 || duration > 1000) {
                    emit('network_event', {
                        url: this._url,
                        method: this._method,
                        status: this.status,
                        duration,
                        requestPayload: this._requestBody ? (typeof this._requestBody === 'string' ? this._requestBody : '[Non-string body]') : null,
                        responseBody: (this.responseText || '').substring(0, 2000)
                    });
                }
            });
            this.addEventListener('error', () => {
                emit('network_error', {
                    url: this._url,
                    method: this._method,
                    message: 'XHR Error',
                    requestPayload: this._requestBody ? (typeof this._requestBody === 'string' ? this._requestBody : '[Non-string body]') : null
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

})();
