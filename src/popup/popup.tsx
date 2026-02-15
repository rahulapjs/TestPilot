/// <reference types="chrome"/>

import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { StorageService } from '../background/storage.ts';
import type { Session } from '../core/types.ts';
import { ReportGenerator } from '../reporting/reportGenerator.ts';
import './popup.css';

function App() {
    const [isActive, setIsActive] = useState(false);
    const [currentSession, setCurrentSession] = useState<Session | null>(null);
    const [allSessions, setAllSessions] = useState<Record<string, Session>>({});
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [config, setConfig] = useState({
        slowApiThreshold: 1000,
        longTaskThreshold: 200,
        escalationThreshold: 10
    });

    useEffect(() => {
        loadSessionState();
    }, []);

    const loadSessionState = async () => {
        setLoading(true);
        const [sessionId, sessions] = await Promise.all([
            StorageService.getCurrentSessionId(),
            StorageService.getAllSessions()
        ]);

        setAllSessions(sessions);

        if (sessions[sessionId || '']) {
            setConfig(sessions[sessionId || ''].config || config);
        }

        if (sessionId) {
            setCurrentSession(sessions[sessionId] || null);
            setIsActive(!!sessions[sessionId]);
        } else {
            setIsActive(false);
            // Don't clear currentSession if we're just loading state, 
            // unless we specifically want to show the idle state.
        }
        setLoading(false);
    };

    const handleStartSession = async () => {
        const envData = {
            userAgent: navigator.userAgent,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            url: location.href,
            platform: (navigator as any).platform || 'unknown'
        };
        chrome.runtime.sendMessage({ action: 'START_SESSION', payload: { envData, config } }, (response) => {
            if (response?.session) {
                setCurrentSession(response.session);
                setIsActive(true);
                setShowSettings(false);
            }
        });
    };

    const handleEndSession = async () => {
        chrome.runtime.sendMessage({ action: 'STOP_SESSION' }, (response) => {
            if (response?.session) {
                setCurrentSession(response.session);
            }
            setIsActive(false);
            loadSessionState();
        });
    };

    const handleExportJSON = () => {
        if (!currentSession) return;
        const json = JSON.stringify(currentSession, null, 2);
        downloadFile(json, `testpilot-${currentSession.sessionId}.json`, 'application/json');
    };

    const handleExportMarkdown = async () => {
        if (!currentSession) return;
        const markdown = await ReportGenerator.generateMarkdown(currentSession);
        downloadFile(markdown, `testpilot-${currentSession.sessionId}.md`, 'text/markdown');
    };

    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getIssueCounts = () => {
        if (!currentSession) return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };

        const counts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            total: currentSession.issues.length
        };

        currentSession.issues.forEach(issue => {
            counts[issue.level]++;
        });

        return counts;
    };

    const getDuration = () => {
        if (!currentSession) return '0s';
        const start = currentSession.startTime;
        const end = currentSession.endTime || Date.now();
        const durationMs = end - start;
        const seconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    const handleClearHistory = async () => {
        if (confirm('Clear all session history?')) {
            await StorageService.clearAll();
            await loadSessionState();
            setShowHistory(false);
        }
    };

    if (loading) {
        return (
            <div class="container">
                <div class="loading">Loading...</div>
            </div>
        );
    }

    const counts = getIssueCounts();
    const sortedSessions = Object.values(allSessions).sort((a, b) => b.startTime - a.startTime);

    const IssueList = ({ issues }: { issues: any[] }) => {
        const [filter, setFilter] = useState<string>('all');

        if (issues.length === 0) {
            return <p class="no-issues">No issues detected yet.</p>;
        }

        const filteredIssues = filter === 'all'
            ? issues
            : issues.filter(i => i.level === filter);

        return (
            <div class="issue-list-container">
                <div class="issue-list-header">
                    <h3 class="section-subtitle">Recent Issues</h3>
                    <div class="filter-container">
                        <button
                            class={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All
                        </button>
                        <button
                            class={`filter-btn ${filter === 'critical' ? 'active' : ''}`}
                            onClick={() => setFilter('critical')}
                        >
                            Critical
                        </button>
                        <button
                            class={`filter-btn ${filter === 'high' ? 'active' : ''}`}
                            onClick={() => setFilter('high')}
                        >
                            High
                        </button>
                        <button
                            class={`filter-btn ${filter === 'medium' ? 'active' : ''}`}
                            onClick={() => setFilter('medium')}
                        >
                            Medium
                        </button>
                        <button
                            class={`filter-btn ${filter === 'low' ? 'active' : ''}`}
                            onClick={() => setFilter('low')}
                        >
                            Low
                        </button>
                    </div>
                </div>
                <div class="issue-list">
                    {filteredIssues.slice().reverse().map((issue, idx) => (
                        <div key={issue.id || idx} class={`issue-item ${issue.level}`}>
                            <div class="issue-item-header">
                                <span class="issue-type">{issue.type.replace('_', ' ')}</span>
                                <span class="issue-occ">x{issue.occurrences}</span>
                            </div>
                            <div class="issue-msg">{issue.message}</div>
                            {issue.metadata?.duration && (
                                <div class="issue-meta">{issue.metadata.duration}ms • {issue.metadata.status || 'Error'}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div class="container">
            <header class="header">
                <div>
                    <h1 class="title">TestPilot</h1>
                    <p class="subtitle">Intelligent bug detection</p>
                </div>
                {!isActive && (
                    <div class="header-actions">
                        <button class="btn-icon" onClick={() => { setShowSettings(!showSettings); setShowHistory(false); }} title="Settings">
                            {showSettings ? '×' : '⚙'}
                        </button>
                        <button class="btn-icon" onClick={() => { setShowHistory(!showHistory); setShowSettings(false); }} title="History">
                            {showHistory ? '×' : '◷'}
                        </button>
                    </div>
                )}
            </header>

            {showSettings ? (
                <div class="settings-state">
                    <h2 class="section-title">Global Settings</h2>
                    <div class="settings-list">
                        <div class="setting-item">
                            <label>Slow API Threshold (ms)</label>
                            <input
                                type="number"
                                value={config.slowApiThreshold}
                                onChange={(e) => setConfig({ ...config, slowApiThreshold: parseInt((e.target as HTMLInputElement).value) })}
                            />
                        </div>
                        <div class="setting-item">
                            <label>Long Task Threshold (ms)</label>
                            <input
                                type="number"
                                value={config.longTaskThreshold}
                                onChange={(e) => setConfig({ ...config, longTaskThreshold: parseInt((e.target as HTMLInputElement).value) })}
                            />
                        </div>
                        <div class="setting-item">
                            <label>Escalation Threshold (counts)</label>
                            <input
                                type="number"
                                value={config.escalationThreshold}
                                onChange={(e) => setConfig({ ...config, escalationThreshold: parseInt((e.target as HTMLInputElement).value) })}
                            />
                        </div>
                    </div>
                    <button class="btn btn-primary" onClick={() => setShowSettings(false)}>Save & Close</button>
                </div>
            ) : showHistory ? (
                <div class="history-state">
                    <div class="section-header">
                        <h2 class="section-title">Session History</h2>
                        <button class="btn btn-link btn-sm" onClick={handleClearHistory}>Clear All</button>
                    </div>
                    {sortedSessions.length === 0 ? (
                        <p class="empty-state">No past sessions found.</p>
                    ) : (
                        <div class="session-list">
                            {sortedSessions.map(session => (
                                <div
                                    key={session.sessionId}
                                    class={`session-card ${currentSession?.sessionId === session.sessionId ? 'active' : ''}`}
                                    onClick={() => {
                                        setCurrentSession(session);
                                        setShowHistory(false);
                                    }}
                                >
                                    <div class="session-card-header">
                                        <span class="session-date">
                                            {new Date(session.startTime).toLocaleString()}
                                        </span>
                                        <span class="issue-count-pill">
                                            {session.issues.length} {session.issues.length === 1 ? 'issue' : 'issues'}
                                        </span>
                                    </div>
                                    <div class="session-card-meta">
                                        ID: {session.sessionId.substring(0, 8)}...
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <>

                    {!isActive && !currentSession && (
                        <div class="idle-state">
                            <p class="description">Start a test session to monitor your application for issues.</p>
                            <button class="btn btn-primary" onClick={handleStartSession}>
                                Start Session
                            </button>
                        </div>
                    )}

                    {isActive && currentSession && (
                        <div class="active-state">
                            <div class="status-badge recording">● Recording</div>

                            <div class="stats">
                                <div class="stat-item">
                                    <span class="stat-label">Duration</span>
                                    <span class="stat-value">{getDuration()}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Issues</span>
                                    <span class="stat-value">{counts.total}</span>
                                </div>
                            </div>

                            {counts.total > 0 && (
                                <div class="issue-counts">
                                    {counts.critical > 0 && (
                                        <div class="issue-count critical">
                                            <span class="count-badge">{counts.critical}</span>
                                            <span class="count-label">Critical</span>
                                        </div>
                                    )}
                                    {counts.high > 0 && (
                                        <div class="issue-count high">
                                            <span class="count-badge">{counts.high}</span>
                                            <span class="count-label">High</span>
                                        </div>
                                    )}
                                    {counts.medium > 0 && (
                                        <div class="issue-count medium">
                                            <span class="count-badge">{counts.medium}</span>
                                            <span class="count-label">Medium</span>
                                        </div>
                                    )}
                                    {counts.low > 0 && (
                                        <div class="issue-count low">
                                            <span class="count-badge">{counts.low}</span>
                                            <span class="count-label">Low</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <IssueList issues={currentSession.issues} />

                            <button class="btn btn-danger" onClick={handleEndSession}>
                                End Session
                            </button>
                        </div>
                    )}

                    {!isActive && currentSession && (
                        <div class="completed-state">
                            <div class="status-badge completed">✓ Session Completed</div>

                            <div class="stats">
                                <div class="stat-item">
                                    <span class="stat-label">Duration</span>
                                    <span class="stat-value">{getDuration()}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Total Issues</span>
                                    <span class="stat-value">{counts.total}</span>
                                </div>
                            </div>

                            {counts.total > 0 && (
                                <div class="issue-counts">
                                    {counts.critical > 0 && (
                                        <div class="issue-count critical">
                                            <span class="count-badge">{counts.critical}</span>
                                            <span class="count-label">Critical</span>
                                        </div>
                                    )}
                                    {counts.high > 0 && (
                                        <div class="issue-count high">
                                            <span class="count-badge">{counts.high}</span>
                                            <span class="count-label">High</span>
                                        </div>
                                    )}
                                    {counts.medium > 0 && (
                                        <div class="issue-count medium">
                                            <span class="count-badge">{counts.medium}</span>
                                            <span class="count-label">Medium</span>
                                        </div>
                                    )}
                                    {counts.low > 0 && (
                                        <div class="issue-count low">
                                            <span class="count-badge">{counts.low}</span>
                                            <span class="count-label">Low</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <IssueList issues={currentSession.issues} />

                            <div class="export-section">
                                <h3 class="export-title">Export Report</h3>
                                <div class="export-buttons">
                                    <button class="btn btn-secondary" onClick={handleExportJSON}>
                                        📄 JSON
                                    </button>
                                    <button class="btn btn-secondary" onClick={handleExportMarkdown}>
                                        📝 Markdown
                                    </button>
                                </div>
                            </div>

                            <button class="btn btn-primary" onClick={handleStartSession}>
                                Start New Session
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

render(<App />, document.getElementById('app')!);
