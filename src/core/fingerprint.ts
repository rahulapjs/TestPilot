export function generateFingerprint(message: string, file: string = '', line: number = 0): string {
    // Simple hash for deduplication
    const str = `${message}|${file}|${line}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
}
