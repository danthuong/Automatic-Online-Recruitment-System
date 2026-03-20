# Electron Client - Anti-Cheat Exam Application

Desktop application for conducting secure online assessments with AI-powered proctoring.

## Tech Stack

- **Framework**: Electron + React + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Code Editor**: Monaco Editor
- **State Management**: Zustand
- **Proctoring**: MediaPipe Face Mesh, Web Audio API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server with hot reload
npm run dev
```

The application will launch in development mode with:
- React app running on Vite dev server
- Electron main process with IPC
- Hot module replacement enabled

### Build

```bash
# Build for production
npm run build

# Package as executable
npm run package
```

## Project Structure

```
electron-client/
├── electron/              # Electron main process
│   ├── main.ts            # Main process entry
│   └── preload.ts         # Preload script (IPC bridge)
├── src/
│   └── renderer/          # React frontend
│       ├── components/
│       │   ├── ui/        # Base UI components
│       │   ├── exam/      # Exam interface components
│       │   ├── questions/ # Question type components
│       │   ├── proctoring/# Proctoring components
│       │   └── screens/   # Screen components
│       ├── store/         # Zustand state management
│       ├── lib/           # Utility functions
│       ├── App.tsx        # Main app component
│       └── main.tsx       # React entry point
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind CSS config
└── package.json
```

## Features

### Exam Interface
- Clean, modern minimalist design
- Multiple choice questions
- Code editor with syntax highlighting
- Essay input with word count
- Question navigation sidebar
- Real-time timer with warnings

### Proctoring
- Camera preview with live indicator
- Status monitoring
- Warning system for suspicious behavior

### Anti-Cheat
- Kiosk mode (locks screen)
- Always-on-top window
- Process monitoring (kill suspicious apps)

### Security
- Context isolation enabled
- Node integration disabled
- Content Security Policy configured

## Screen Flow

1. **Login** - Enter Test ID and Candidate ID
2. **Pre-Check** - Camera verification and system checklist
3. **Exam** - Main assessment interface
4. **Results** - Submission confirmation

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run test` | Run tests |
| `npm run package` | Package as executable |
