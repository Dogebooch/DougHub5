# DougHub Electron App - Project Documentation
**Electron-Vite React TypeScript Application**

Generated: January 4, 2026

---

## Project Overview

**Type:** Electron Desktop Application with React Frontend  
**Build Tool:** Vite 5.1.6 with electron-vite plugins  
**Framework:** React 18.2.0 with TypeScript 5.2.2  
**Packaging:** electron-builder 24.13.3  
**Status:** Fresh scaffold from `create-electron-vite` template

---

## File Structure

```
doughub --template react-ts/
├── .eslintrc.cjs           # ESLint configuration
├── .gitignore              # Git ignore rules
├── electron-builder.json5  # Electron packaging config
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── README.md               # Template readme
├── tsconfig.json           # TypeScript config (renderer)
├── tsconfig.node.json      # TypeScript config (node/electron)
├── vite.config.ts          # Vite configuration
│
├── dist-electron/          # Compiled Electron files (generated)
│   ├── main.js             # Compiled main process
│   └── preload.mjs         # Compiled preload script
│
├── electron/               # Electron source files
│   ├── electron-env.d.ts   # TypeScript declarations
│   ├── main.ts             # Main process entry
│   └── preload.ts          # Preload script (context bridge)
│
├── public/                 # Static assets
│   └── (SVG logos)
│
└── src/                    # React application source
    ├── App.css             # App component styles
    ├── App.tsx             # Main React component
    ├── index.css           # Global styles
    ├── main.tsx            # React entry point
    ├── vite-env.d.ts       # Vite type declarations
    └── assets/             # Bundled assets
```

---

## Dependencies

### Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.2.0 | UI library |
| react-dom | ^18.2.0 | React DOM renderer |

### Development Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| electron | ^30.0.1 | Desktop runtime |
| electron-builder | ^24.13.3 | App packaging |
| vite | ^5.1.6 | Build tool |
| vite-plugin-electron | ^0.28.6 | Electron integration |
| vite-plugin-electron-renderer | ^0.14.5 | Renderer polyfills |
| @vitejs/plugin-react | ^4.2.1 | React Fast Refresh |
| typescript | ^5.2.2 | Type checking |
| @types/react | ^18.2.64 | React types |
| @types/react-dom | ^18.2.21 | ReactDOM types |
| eslint | ^8.57.0 | Linting |
| @typescript-eslint/eslint-plugin | ^7.1.1 | TS ESLint rules |
| @typescript-eslint/parser | ^7.1.1 | TS ESLint parser |
| eslint-plugin-react-hooks | ^4.6.0 | React hooks linting |
| eslint-plugin-react-refresh | ^0.4.5 | HMR linting |

---

## Electron Architecture

### Main Process (`electron/main.ts`)

**Purpose:** Controls app lifecycle and creates browser windows

**Key Variables:**
- `VITE_DEV_SERVER_URL` - Dev server URL from environment
- `MAIN_DIST` - Path to `dist-electron/`
- `RENDERER_DIST` - Path to `dist/`
- `VITE_PUBLIC` - Path to public assets

**Functions:**
- `createWindow()` - Creates BrowserWindow with preload script
  - Window icon: `electron-vite.svg`
  - Preload: `preload.mjs`
  - Dev mode: Loads Vite dev server URL
  - Production: Loads `dist/index.html`

**Event Handlers:**
- `window-all-closed` - Quits app (except macOS)
- `activate` - Recreates window on macOS dock click
- `whenReady` - Initial window creation

**IPC Communication:**
- Sends `main-process-message` with timestamp on window load

### Preload Script (`electron/preload.ts`)

**Purpose:** Exposes safe IPC methods to renderer via context bridge

**Exposed API (`window.ipcRenderer`):**
| Method | Purpose |
|--------|---------|
| `on(channel, listener)` | Subscribe to IPC events |
| `off(channel, listener)` | Unsubscribe from IPC events |
| `send(channel, ...args)` | Send async message to main |
| `invoke(channel, ...args)` | Invoke main and await response |

**Security:**
- Uses `contextBridge.exposeInMainWorld`
- Wraps native `ipcRenderer` methods
- No direct Node.js access in renderer

### Type Declarations (`electron/electron-env.d.ts`)

**Process Environment:**
- `APP_ROOT` - Application root directory
- `VITE_PUBLIC` - Public assets directory

**Window Interface:**
- `window.ipcRenderer` - Exposed IPC methods

---

## React Application

### Entry Point (`src/main.tsx`)

- Renders `<App />` into `#root`
- Wrapped in `<React.StrictMode>`
- Subscribes to `main-process-message` IPC event
- Logs timestamp from main process on load

### App Component (`src/App.tsx`)

**State:**
- `count` (number) - Counter state via `useState`

**Features:**
- Displays Vite and React logos
- Interactive counter button
- HMR testing instructions
- Links to documentation

**Status:** Default Vite template - no custom implementation

---

## Styling

### Global Styles (`src/index.css`)

**Font Stack:** Inter, system-ui, Avenir, Helvetica, Arial, sans-serif

**Color Scheme:**
- Dark mode default: `#242424` background, `rgba(255,255,255,0.87)` text
- Light mode: `#ffffff` background, `#213547` text
- Accent color: `#646cff` (links/buttons)

**Base Styles:**
- Body: flexbox centered, min-height 100vh
- Buttons: rounded, 0.6em padding, hover border effect
- Links: inherited decoration, weight 500

### Component Styles (`src/App.css`)

**Layout:**
- `#root`: max-width 1280px, centered, 2rem padding

**Logo Animations:**
- Hover glow effect (drop-shadow)
- React logo: 20s infinite rotation
- Respects `prefers-reduced-motion`

---

## Build Configuration

### Vite Config (`vite.config.ts`)

**Plugins:**
1. `@vitejs/plugin-react` - React Fast Refresh
2. `vite-plugin-electron/simple` - Electron integration
   - Main process entry: `electron/main.ts`
   - Preload script: `electron/preload.ts`
   - Renderer polyfills enabled (except in test mode)

### TypeScript Config (`tsconfig.json`)

**Compiler Options:**
- Target: ES2020
- Module: ESNext with bundler resolution
- JSX: react-jsx
- Strict mode enabled
- No unused locals/parameters
- No fallthrough in switch

**Includes:** `src/`, `electron/`

### ESLint Config (`.eslintrc.cjs`)

**Extends:**
- `eslint:recommended`
- `plugin:@typescript-eslint/recommended`
- `plugin:react-hooks/recommended`

**Parser:** `@typescript-eslint/parser`

**Plugins:**
- `react-refresh` - Validates HMR exports

---

## Electron Builder Config (`electron-builder.json5`)

### Application Metadata
- App ID: `YourAppID` (placeholder)
- Product Name: `YourAppName` (placeholder)
- ASAR: Enabled

### Build Outputs
| Platform | Format | Artifact Name Pattern |
|----------|--------|----------------------|
| macOS | DMG | `${productName}-Mac-${version}-Installer.dmg` |
| Windows | NSIS | `${productName}-Windows-${version}-Setup.exe` |
| Linux | AppImage | `${productName}-Linux-${version}.AppImage` |

### Directories
- Output: `release/${version}/`
- Files: `dist/`, `dist-electron/`

### NSIS Options (Windows)
- One-click: false
- Per-machine: false
- Allow directory change: true
- Delete app data on uninstall: false

---

## NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start dev server with HMR |
| `build` | `tsc && vite build && electron-builder` | Full production build |
| `lint` | `eslint . --ext ts,tsx` | Run ESLint with zero warnings |
| `preview` | `vite preview` | Preview production build |

---

## IPC Communication Pattern

### Current Implementation

**Main → Renderer:**
```
main.ts: win.webContents.send('main-process-message', timestamp)
     ↓
preload.ts: contextBridge exposure
     ↓
main.tsx: window.ipcRenderer.on('main-process-message', callback)
```

### Available IPC Methods

| Direction | Method | Usage |
|-----------|--------|-------|
| Main → Renderer | `webContents.send()` | Push messages |
| Renderer → Main | `ipcRenderer.send()` | Fire-and-forget |
| Renderer → Main → Renderer | `ipcRenderer.invoke()` | Request-response |

---

## Development Workflow

### Hot Module Replacement
1. Vite dev server runs on `http://localhost:5173/`
2. Electron main process loads dev server URL
3. React components hot-reload on save
4. Main process requires restart for changes

### Build Process
1. TypeScript compilation (`tsc`)
2. Vite builds renderer to `dist/`
3. Vite builds main/preload to `dist-electron/`
4. electron-builder packages application

---

## Feature Implementation Status

### ✅ Configured
- Electron main process with window management
- React renderer with TypeScript
- IPC context bridge setup
- Vite HMR for development
- ESLint with TypeScript/React rules
- Cross-platform build configuration
- Dark/light mode CSS

### ❌ Not Implemented (Template Defaults)
- Application-specific UI
- State management
- Data persistence
- Custom IPC handlers
- Menu bar configuration
- Tray icon
- Auto-updates
- Native dialogs
- File system access
- Custom window chrome

---

## Directory Purpose Summary

| Directory | Purpose |
|-----------|---------|
| `electron/` | Main process and preload source |
| `src/` | React application source |
| `public/` | Static assets (copied to dist) |
| `dist/` | Built renderer (generated) |
| `dist-electron/` | Built main/preload (generated) |
| `release/` | Packaged installers (on build) |

---

## Technology Stack Summary

| Layer | Technology |
|-------|------------|
| Runtime | Electron 30.0.1 |
| UI Framework | React 18.2.0 |
| Language | TypeScript 5.2.2 |
| Bundler | Vite 5.1.6 |
| Build/Package | electron-builder 24.13.3 |
| Linting | ESLint 8.57.0 |
| Styling | Plain CSS (no framework) |

---

**Project Type:** Electron Desktop Application Scaffold  
**Primary Use Case:** Starting point for desktop app development  
**Current State:** Unmodified template with counter demo
