---
date: 2025-12-06
task_id: "splash-screen"
researcher: claude
git_commit: 0410a43
branch: main
topic: "Brief 2-second splash screen with animated ASCII art for Ralph"
tags: [research, codebase, splash-screen, ascii-art, animation, ink]
status: complete
---

# Research: Brief 2-second splash screen with animated ASCII art for Ralph

**Task ID**: splash-screen  
**Date**: 2025-12-06
**Git Commit**: 0410a43  
**Branch**: main

## Task Assignment
Show a brief 2-second splash screen with animated ASCII art for 'Ralph' upon launch

## Summary
The Ralph TUI already has ASCII art for "RALPH" and established animation patterns. The application displays a `StartScreen` component when no messages exist (`.ralph/tui/src/components/start-screen.tsx`), which includes static ASCII art. Animation infrastructure exists via `setInterval` patterns used in the Spinner component. The launch sequence flows through `cli.tsx` → `render()` → `App` component, providing a clear insertion point for a timed splash screen before the main interface loads.

## Detailed Findings

### Existing ASCII Art Implementation
- **Current ASCII Art**: `.ralph/tui/src/components/start-screen.tsx:6-13`
  - Static bubble-letter "RALPH" using Unicode box-drawing characters (█, ╗, ╔, ╚, ╝, ═, ║)
  - Stored as template literal constant `RALPH_ASCII`
  - Displayed with Ink's Text component with color styling
  - Currently shown in StartScreen when no messages exist

### Animation Infrastructure
- **Spinner Component Pattern**: `.ralph/tui/src/components/common/spinner.tsx:22-39`
  - Uses `setInterval` with 80ms intervals for frame cycling
  - `useState` tracks current frame index
  - Modulo operator cycles through frame arrays
  - Cleanup via `clearInterval` in useEffect return
  - Three animation types: dots, line, arrow

- **Timing Patterns in Codebase**:
  - Spinner animations: 80ms intervals
  - Process startup delay: 2000ms (`.ralph/tui/src/hooks/use-ralph-process.ts:126`)
  - Process termination wait: 500ms
  - Process status checks: 5000ms intervals

### Launch Sequence and Entry Points
- **Primary Entry**: `.ralph/tui/src/cli.tsx:1`
  - Shebang executable with Commander CLI parsing
  - Project root discovery (lines 13-39)
  - Configuration loading (lines 95-118)
  - Session management (lines 120-166)
  - **React Rendering**: Line 169 calls `render(<App .../>)` - ideal insertion point

- **App Component Initialization**: `.ralph/tui/src/app.tsx:39-611`
  - State initialization (lines 45-78)
  - Data hooks setup (lines 82-121)
  - Component hierarchy with conditional rendering
  - StartScreen shown when `messages.length === 0 && !isRunning` (line 461)

### Component Lifecycle Management
- **View State Transitions**: `.ralph/tui/src/app.tsx:67-78`
  - `currentView` state controls which view is displayed
  - `currentTab` manages active tab selection
  - Overlay states for modals (SessionPicker, ShortcutsDialog)

- **Mounting/Unmounting Patterns**:
  - Components naturally mount/unmount through React reconciliation
  - useEffect cleanup functions handle teardown
  - No explicit unmount handlers needed

- **Conditional Rendering Flow**: `.ralph/tui/src/app.tsx:423-528`
  - `renderContent` function switches on currentView and currentTab
  - Overlays render conditionally based on state flags

### Text Styling Capabilities
- **Ink Text Props Available**:
  - `bold`, `italic`, `underline`, `inverse` for emphasis
  - `color` and `backgroundColor` for styling
  - Centralized color definitions in `.ralph/tui/src/lib/colors.ts`

- **Border Styles**: Components use `borderStyle` prop
  - Options: `single`, `double`, `round`, `classic`
  - Combined with `borderColor` and padding

- **Unicode Characters**: Extensive use of Unicode for UI elements
  - Icons defined in `.ralph/tui/src/lib/colors.ts:70-96`
  - Progress bars with block characters (█, ░)
  - Box-drawing characters for ASCII art

### Existing StartScreen Component
- **Location**: `.ralph/tui/src/components/start-screen.tsx`
- **Current Features**:
  - Displays RALPH ASCII art (lines 17-24)
  - Shows tagline rotation (lines 52-58)
  - Keyboard shortcuts guide (lines 60-101)
  - Already positioned and styled appropriately

### No External Dependencies
- No figlet or ASCII art generation libraries
- No animation libraries beyond React/Ink
- All decorative elements created with Unicode and built-in Ink capabilities

## Code References
- `.ralph/tui/src/cli.tsx:169` - render() call where splash could be injected
- `.ralph/tui/src/app.tsx:39` - App component that could manage splash state
- `.ralph/tui/src/components/start-screen.tsx:6-13` - Existing RALPH ASCII art
- `.ralph/tui/src/components/common/spinner.tsx:22-39` - Animation pattern to follow
- `.ralph/tui/src/hooks/use-ralph-process.ts:126` - 2000ms delay pattern already in use
- `.ralph/tui/src/app.tsx:461` - Current StartScreen display logic
- `.ralph/tui/src/lib/colors.ts:10-42` - Color theme definitions

## Architecture Documentation

### Current Component Hierarchy
```
cli.tsx (entry)
  └── render(<App />)
       └── <Box flexDirection="column">
            ├── <Header />
            ├── <TabBar /> (conditional)
            ├── Main Content Area
            │   └── StartScreen (when no messages)
            ├── <Sidebar /> (conditional)
            └── <Footer />
```

### State Management Pattern
- Centralized state in App component
- Props passed down to children
- Callbacks for state updates
- No global state management library

### Animation Conventions
- `setInterval` for periodic updates
- `useState` for frame tracking
- `useEffect` with cleanup for lifecycle
- 80ms intervals for smooth animation

### File Structure Conventions
```
src/
├── components/
│   ├── common/        # Reusable components like Spinner
│   └── start-screen.tsx  # Current startup display
├── hooks/             # Custom React hooks
└── lib/               # Utilities and constants
```

## Historical Context (from .ai-docs/thoughts/)
No existing historical documentation found specifically about splash screens or startup animations in the thoughts directory.

## Related Documentation
- `.ai-docs/design/product-brief.md` - Product context for Ralph TUI
- `.ai-docs/adr/002-tech-stack.md` - Technology choices including Ink
- `AGENTS.md` - Project overview and development commands

## Open Questions
None - the codebase has all necessary infrastructure for implementing a 2-second animated splash screen. The existing StartScreen component with RALPH ASCII art, combined with established animation patterns from the Spinner component, provide a clear implementation path.