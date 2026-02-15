/// <reference types="chrome"/>

export class SecurityScanner {
    private static JWT_REGEX = /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/g;
    private static EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    private static PHONE_REGEX = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    private static API_KEY_REGEX = /(api[_-]?key|apikey|access[_-]?token|secret[_-]?key)[\s:=]+['""]?([a-zA-Z0-9_\-]{20,})['""]?/gi;

    static scanForSensitiveData(text: string): { found: boolean; types: string[] } {
        const types: string[] = [];

        if (this.JWT_REGEX.test(text)) types.push('JWT Token');
        if (this.EMAIL_REGEX.test(text)) types.push('Email Address');
        if (this.PHONE_REGEX.test(text)) types.push('Phone Number');
        if (this.API_KEY_REGEX.test(text)) types.push('API Key/Secret');

        return {
            found: types.length > 0,
            types
        };
    }

    static checkConsoleOutput(message: string): void {
        const scan = this.scanForSensitiveData(message);

        if (scan.found) {
            chrome.runtime.sendMessage({
                action: 'TELEMETRY_EVENT',
                payload: {
                    type: 'security_risk',
                    message: `Potential sensitive data in console: ${scan.types.join(', ')}`,
                    url: window.location.href,
                    metadata: {
                        detectedTypes: scan.types,
                        snippet: message.substring(0, 100)
                    }
                }
            });
        }
    }
}
