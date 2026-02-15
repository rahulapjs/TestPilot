# 🧪 TestPilot - Production Bug Detection Extension

**Catch production bugs before users do.**

TestPilot is a production-quality QA observability Chrome extension that monitors web applications during manual testing sessions and automatically detects runtime crashes, console errors, network failures, slow APIs, and potential security risks.

---

## ✨ Features

### Session-Based Workflow
- **Start/Stop Sessions**: Control monitoring with a simple UI
- **Real-time Monitoring**: Silent background monitoring without disrupting testing
- **Issue Detection**: Automatic categorization by severity (Critical, High, Medium, Low)

### Comprehensive Monitoring
- **Runtime Crashes**: `window.onerror`, unhandled promise rejections
- **Console Errors**: `console.error`, `console.warn` with stack traces
- **Network Failures**: Failed HTTP requests (4xx, 5xx)
- **Slow APIs**: Requests exceeding 3000ms
- **Security Risks**: Potential PII/secret leaks in console output

### Professional Reporting
- **Deduplication**: Intelligent fingerprinting prevents duplicate issues
- **Structured Reports**: Export to JSON or Markdown
- **Timeline View**: Chronological issue tracking
- **QA-Ready**: Professional formatting for bug reports

---

## 🏗️ Architecture

### Manifest V3 Compliant
Built with modern Chrome Extension standards.

### Modular Design

```
src/
├── background/          # Service Worker (Event Processing Engine)
│   ├── main.ts         # Entry point
│   ├── eventProcessor.ts   # Telemetry processing & deduplication
│   ├── sessionManager.ts   # Session lifecycle
│   ├── severityEngine.ts   # Issue classification
│   └── storage.ts      # chrome.storage wrapper
│
├── content/            # Injected Monitors
│   ├── main.ts         # Orchestrator
│   ├── consoleMonitor.ts   # Console override
│   ├── runtimeMonitor.ts   # Error/rejection listeners
│   ├── networkMonitor.ts   # Fetch/XHR proxy
│   └── securityScanner.ts  # PII detection
│
├── popup/              # Extension UI
│   ├── popup.tsx       # Preact app
│   ├── popup.css       # Styling
│   └── index.html      # Entry point
│
├── core/               # Shared Logic
│   ├── types.ts        # TypeScript interfaces
│   ├── fingerprint.ts  # Deduplication hashing
│   └── issueFactory.ts # Issue creation
│
└── reporting/          # Export
    └── reportGenerator.ts  # Markdown/JSON export
```

---

## 🚀 Installation & Usage

### Build from Source

```bash
# Install dependencies
npm install

# Build extension
npm run build
```

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist` folder from this project
5. TestPilot icon should appear in your extensions toolbar

### Using TestPilot

1. **Start a Session**
   - Click the TestPilot icon
   - Click "Start Session"
   - Navigate to your web application

2. **Perform Testing**
   - Use your application normally
   - TestPilot monitors silently in the background
   - Badge shows issue count

3. **End Session**
   - Click TestPilot icon
   - Click "End Session"
   - View summary and export reports

---

## 📊 Issue Types & Severity

### Critical 🔴
- Runtime crashes (`window.onerror`)
- Unhandled promise rejections
- HTTP 5xx errors

### High 🟠
- `console.error` calls
- HTTP 4xx errors
- Security risks (PII leaks)

### Medium 🟡
- `console.warn` calls
- Slow API requests (>3s)

### Low ⚪
- Informational logs

---

## 🛠️ Tech Stack

- **Language**: TypeScript (strict mode)
- **UI Framework**: Preact
- **Build Tool**: Vite
- **Storage**: chrome.storage.local
- **Architecture**: Event-driven, modular

---

## 📦 Data Schema

### Issue Model
```typescript
interface Issue {
  id: string;
  fingerprint: string;  // For deduplication
  sessionId: string;
  type: IssueType;
  level: IssueLevel;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  stackTrace?: string;
  url: string;
  metadata?: Record<string, any>;
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
}
```

### Session Model
```typescript
interface Session {
  sessionId: string;
  startTime: number;
  endTime?: number;
  issues: Issue[];
}
```

---

## 🔒 Privacy & Permissions

### Required Permissions
- `storage`: Local session data storage
- `activeTab`: Inject monitoring scripts
- `scripting`: Content script injection
- `<all_urls>`: Monitor any website

### Data Storage
- All data stored **locally** in browser
- No backend, no cloud sync
- No data leaves your machine

---

## 🎯 Future Enhancements

The architecture is designed to support:
- AI-powered issue analysis
- Backend integration for team collaboration
- CI/CD pipeline integration
- Advanced filtering and search
- Custom severity rules

---

## 📝 Export Formats

### JSON
Structured data for programmatic processing:
```json
{
  "sessionId": "...",
  "startTime": 1234567890,
  "endTime": 1234567900,
  "issues": [...]
}
```

### Markdown
QA-ready reports with:
- Executive summary
- Release blockers
- Issue categorization
- Timeline view
- Stack traces

---

## 🧪 Development

### Project Structure
- `src/` - Source code
- `dist/` - Build output (load this in Chrome)
- `public/` - Static assets
- `manifest.json` - Extension manifest

### Build Commands
```bash
npm run dev     # Development server (for popup UI testing)
npm run build   # Production build
```

### TypeScript Configuration
- Strict mode enabled
- `verbatimModuleSyntax` for clean imports
- Chrome types via `@types/chrome`

---

## 📄 License

This is a demonstration project showcasing production-quality Chrome extension development.

---

## 🤝 Contributing

This project follows professional coding standards:
- Modular architecture
- Strong typing
- Event-driven design
- Separation of concerns
- Extensible patterns

---

## 📞 Support

For issues or questions, please refer to the code documentation and inline comments.

---

**Built with ❤️ for QA engineers and developers who care about quality.**
