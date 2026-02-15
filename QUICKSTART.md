# TestPilot - Quick Start Guide

## 🚀 Load Extension in Chrome

1. **Build Complete** ✅
   - The extension has been built successfully
   - All files are in the `dist/` folder

2. **Load in Chrome**:
   ```
   1. Open Chrome
   2. Go to: chrome://extensions/
   3. Enable "Developer mode" (top right toggle)
   4. Click "Load unpacked"
   5. Select the "dist" folder from: D:\TestPilot\dist
   ```

3. **Start Using**:
   - Click the TestPilot icon in your toolbar
   - Click "Start Session"
   - Navigate to any website
   - Trigger some errors (open console and type: `throw new Error("test")`)
   - Click TestPilot icon again
   - Click "End Session"
   - Export your report!

## 📁 Project Structure

```
TestPilot/
├── dist/                 ← Load this folder in Chrome
│   ├── manifest.json
│   ├── icons/
│   └── src/
│       ├── background/
│       ├── content/
│       └── popup/
├── src/                  ← Source code
├── README.md             ← Full documentation
└── package.json
```

## 🎯 What It Does

- **Monitors**: Console errors, runtime crashes, network failures, slow APIs
- **Detects**: Security risks (JWT tokens, emails in console)
- **Reports**: Professional Markdown or JSON exports
- **Deduplicates**: Smart fingerprinting prevents duplicate issues

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Development mode (popup UI only)
npm run dev
```

## ✨ Features

✅ Session-based workflow
✅ Real-time issue detection
✅ Severity classification (Critical/High/Medium/Low)
✅ Deduplication engine
✅ Professional QA reports
✅ No backend required
✅ Privacy-first (all data local)

## 📊 Issue Types

- 🔴 **Critical**: Runtime crashes, 5xx errors, unhandled rejections
- 🟠 **High**: console.error, 4xx errors, security risks
- 🟡 **Medium**: console.warn, slow APIs (>3s)
- ⚪ **Low**: Info logs

---

**Ready to use! Load the `dist` folder in Chrome and start testing.**
