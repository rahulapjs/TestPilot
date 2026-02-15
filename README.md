# 🧪 TestPilot

**Intelligent Bug Detection & Telemetry Extension for Modern Web Apps**

TestPilot is a powerful, production-grade Chrome extension designed to catch bugs before your users do. It acts as a black-box flight recorder for your web application, capturing console errors, network failures, slow APIs, performance metrics, and security risks in real-time.

![TestPilot Banner](https://via.placeholder.com/800x200?text=TestPilot+Extension)

## ✨ Key Features

- **🚀 Real-time Telemetry**: Captures `console.error`, `console.warn`, unhandled exceptions, and promise rejections.
- **🌐 Network Intelligence**: 
  - Detects **Slow APIs** (>1000ms by default)
  - Identifies **Retry Storms** (rapid repeated failures)
  - Captures **CORS Errors** and HTTP 4xx/5xx failures
- **⚡ Performance Monitoring**:
  - **Long Task Detection**: Flags UI freezes (>200ms)
  - **White Screen Detection**: Alerts on potential rendering crashes
- **🛡️ Security Scanner**:
  - Detects sensitive data leaks (JWTs, API keys, PII) in console/storage
  - Monitors unsafe storage access
- **📱 Smart Context**: Captures environment details (User Agent, Viewport, Route Changes) for actionable bug reports.
- **🧠 Adaptive Severity**: Automatically escalates issue severity based on frequency (e.g., repeating errors become Critical).

## 🛠️ Usage

1. **Install the Extension** (Developer Mode):
   - Clone this repo
   - Run `npm install` and `npm run build`
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

2. **Start a Session**:
   - Click the extension icon
   - Hit **Start Session**
   - Interact with your web application
   - TestPilot records all hidden issues in the background

3. **Analyze & Export**:
   - Open the popup to see a categorized list of issues
   - Use **Filters** to focus on Critical/High severity bugs
   - Click **Export JSON** or **Export Markdown** to generate a bug report

## ⚙️ Configuration

TestPilot includes a **Settings Panel** (click the ⚙ icon) to customize detection thresholds:

| Setting | Default | Description |
|Observed Metric| Threshold | Impact |
|---|---|---|
| **Slow API** | 1000ms | Requests taking longer than this are flagged as "Medium" severity |
| **Long Task** | 200ms | UI freezes longer than this are flagged as "Medium" severity |
| **Escalation** | 10x | Issues repeating this many times automatically upgrade severity |

## 🏗️ Architecture

- **Core**: TypeScript, Vite, Preact
- **State Management**: Chronicled session storage in `chrome.storage.local`
- **Bridge**: Injected script (`bridge.ts`) for deep network/console interception
- **Analysis**: Independent `SeverityEngine` for classifying and prioritizing issues

## 📦 Build & Develop

```bash
# Install dependencies
npm install

# Run development build (watch mode)
npm run dev

# Build for production
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - free to use for personal and commercial projects.
