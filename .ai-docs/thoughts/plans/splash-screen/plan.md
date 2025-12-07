---
date: 2025-12-07
task_id: "splash-screen"
topic: "Animated Ralph Splash Screen"
tags: [plan, implementation, splash-screen, ascii-art, animation, ink]
status: draft
---

# Animated Ralph Splash Screen Implementation Plan

**Task ID**: splash-screen

## Overview

Implement a brief 2-second animated splash screen with ASCII art for 'Ralph' that displays when launching the TUI application, providing visual feedback during startup and enhancing the user experience.

## Task Definition

Show a brief 2-second splash screen with animated ASCII art for 'Ralph' upon launch

## Current State Analysis

The Ralph TUI currently has:
- Static RALPH ASCII art in `.ralph/tui/src/components/start-screen.tsx:6-13`
- Established animation patterns in `.ralph/tui/src/components/common/spinner.tsx:22-39` using setInterval
- Clear launch sequence through `cli.tsx` → `render()` → `App` component
- Existing 2000ms delay patterns already used in the codebase

### Key Discoveries:
- ASCII art already exists and uses Unicode box-drawing characters
- Animation infrastructure is well-established with 80ms frame intervals
- The App component manages all view states and transitions
- No external dependencies needed - all capabilities exist in current stack

## Desired End State

After implementation:
- Application displays an animated RALPH splash screen for exactly 2 seconds on launch
- Splash includes animated ASCII art with smooth frame transitions
- Automatic transition to main interface after the 2-second duration
- Professional, polished startup experience

### Verification:
- Running `pnpm dev:tsx` shows the splash screen for 2 seconds before main UI
- Animation runs smoothly without flicker or performance issues
- Splash doesn't interfere with normal app functionality

## What We're NOT Doing

- Adding external ASCII art libraries (figlet, etc.)
- Creating multiple splash screen variations
- Adding configuration options for splash duration
- Implementing skip functionality (the 2-second duration is brief enough)
- Adding sound effects or complex animations
- Modifying the existing StartScreen component (it serves a different purpose)

## Implementation Approach

Create a dedicated SplashScreen component with frame-based animation following existing patterns, integrate it into the App component's lifecycle with a 2-second timer, and ensure smooth transition to the main interface.

## Phase 1: Create Animated Splash Screen Component

### Overview
Build the SplashScreen component with animated ASCII art following the established Spinner animation pattern.

### Changes Required:

#### 1. Create SplashScreen Component
**File**: `.ralph/tui/src/components/splash-screen.tsx`
**Changes**: New file with animated splash implementation

```typescript
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { colors } from '../lib/colors.js';

// ASCII art frames for animation
const RALPH_FRAMES = [
  // Frame 1: Normal
  `
  ╔═══╗  ╔═══╗  ╔╗     ╔═══╗  ╔╗  ╔╗
  ║   ║  ║   ║  ║║     ║   ║  ║║  ║║
  ╚═╗ ║  ╠═══╣  ║║     ╠═══╝  ╠════╣
  ║ ╚═╝  ║   ║  ║║     ║      ║╔══╗║
  ╚═══╝  ╚═══╝  ╚════╝ ╚════╝ ╚╝  ╚╝
  `,
  // Frame 2: Highlighted R
  `
  █████  ╔═══╗  ╔╗     ╔═══╗  ╔╗  ╔╗
  █   █  ║   ║  ║║     ║   ║  ║║  ║║
  ████   ╠═══╣  ║║     ╠═══╝  ╠════╣
  █ ███  ║   ║  ║║     ║      ║╔══╗║
  █████  ╚═══╝  ╚════╝ ╚════╝ ╚╝  ╚╝
  `,
  // Frame 3: Highlighted A
  `
  ╔═══╗  █████  ╔╗     ╔═══╗  ╔╗  ╔╗
  ║   ║  █   █  ║║     ║   ║  ║║  ║║
  ╚═╗ ║  █████  ║║     ╠═══╝  ╠════╣
  ║ ╚═╝  █   █  ║║     ║      ║╔══╗║
  ╚═══╝  █████  ╚════╝ ╚════╝ ╚╝  ╚╝
  `,
  // Frame 4: Highlighted L
  `
  ╔═══╗  ╔═══╗  ██     ╔═══╗  ╔╗  ╔╗
  ║   ║  ║   ║  ██     ║   ║  ║║  ║║
  ╚═╗ ║  ╠═══╣  ██     ╠═══╝  ╠════╣
  ║ ╚═╝  ║   ║  ██     ║      ║╔══╗║
  ╚═══╝  ╚═══╝  ██████ ╚════╝ ╚╝  ╚╝
  `,
  // Frame 5: Highlighted P
  `
  ╔═══╗  ╔═══╗  ╔╗     █████  ╔╗  ╔╗
  ║   ║  ║   ║  ║║     █   █  ║║  ║║
  ╚═╗ ║  ╠═══╣  ║║     █████  ╠════╣
  ║ ╚═╝  ║   ║  ║║     █      ║╔══╗║
  ╚═══╝  ╚═══╝  ╚════╝ █████  ╚╝  ╚╝
  `,
  // Frame 6: Highlighted H
  `
  ╔═══╗  ╔═══╗  ╔╗     ╔═══╗  ██  ██
  ║   ║  ║   ║  ║║     ║   ║  ██  ██
  ╚═╗ ║  ╠═══╣  ║║     ╠═══╝  ██████
  ║ ╚═╝  ║   ║  ║║     ║      ██████
  ╚═══╝  ╚═══╝  ╚════╝ ╚════╝ ██  ██
  `,
];

interface SplashScreenProps {
  onComplete?: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps): React.ReactElement {
  const [frameIndex, setFrameIndex] = useState(0);
  const [dotCount, setDotCount] = useState(0);

  // Animate ASCII art frames
  useEffect(() => {
    const frameTimer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % RALPH_FRAMES.length);
    }, 300); // Slower than spinner for readability

    return () => clearInterval(frameTimer);
  }, []);

  // Animate loading dots
  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 400);

    return () => clearInterval(dotTimer);
  }, []);

  // Auto-complete after 2 seconds
  useEffect(() => {
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 2000);

    return () => clearTimeout(completeTimer);
  }, [onComplete]);

  const dots = '.'.repeat(dotCount);
  const spaces = ' '.repeat(3 - dotCount);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      <Box marginBottom={1}>
        <Text color={colors.selected}>{RALPH_FRAMES[frameIndex]}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={colors.dimmed}>
          Initializing Ralph TUI{dots}{spaces}
        </Text>
      </Box>
    </Box>
  );
}
```

#### 2. Export from components index
**File**: `.ralph/tui/src/components/index.ts`
**Changes**: Add splash-screen export

```typescript
export { SplashScreen } from './splash-screen.js';
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] Unit tests pass: `pnpm test:run`
- [ ] Type checking passes: `pnpm typecheck`

#### Manual Verification:
- [ ] Component renders without errors
- [ ] ASCII art animation cycles smoothly through frames
- [ ] Loading dots animate correctly
- [ ] onComplete callback fires after 2 seconds

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Integrate Splash Screen with App Component

### Overview
Add splash screen state management to the App component and conditionally render the splash before the main interface.

### Changes Required:

#### 1. Update App Component State
**File**: `.ralph/tui/src/app.tsx`
**Changes**: Add splash screen state management

Add new state after line 48:
```typescript
const [showSplash, setShowSplash] = useState(true);
```

Update the main render logic (around line 530):
```typescript
// Show splash screen first
if (showSplash) {
  return (
    <SplashScreen
      onComplete={() => setShowSplash(false)}
    />
  );
}

// Rest of the existing render logic...
return (
  <Box flexDirection="column" width={width} height={height}>
    {/* existing content */}
  </Box>
);
```

Add import at top of file:
```typescript
import { SplashScreen } from './components/splash-screen.js';
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm build`
- [ ] TypeScript compilation succeeds: `pnpm typecheck`
- [ ] No import errors

#### Manual Verification:
- [ ] Splash screen displays on app launch
- [ ] Splash automatically transitions to main UI after 2 seconds
- [ ] No visual glitches during transition
- [ ] Main app functionality remains unchanged after splash

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Add Tests and Polish

### Overview
Create comprehensive tests for the splash screen component and ensure smooth integration.

### Changes Required:

#### 1. Create Splash Screen Tests
**File**: `.ralph/tui/src/components/splash-screen.test.tsx`
**Changes**: New test file

```typescript
import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { SplashScreen } from './splash-screen.js';

describe('SplashScreen', () => {
  it('renders ASCII art', () => {
    const { lastFrame } = render(<SplashScreen />);
    const output = lastFrame();
    
    // Should contain Ralph text (checking for key characters)
    expect(output).toContain('╔');
    expect(output).toContain('╗');
    expect(output).toContain('║');
  });

  it('displays loading message', () => {
    const { lastFrame } = render(<SplashScreen />);
    const output = lastFrame();
    
    expect(output).toContain('Initializing Ralph TUI');
  });

  it('calls onComplete after 2 seconds', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    
    render(<SplashScreen onComplete={onComplete} />);
    
    // Should not be called immediately
    expect(onComplete).not.toHaveBeenCalled();
    
    // Advance time by 2 seconds
    vi.advanceTimersByTime(2000);
    
    // Should be called after 2 seconds
    expect(onComplete).toHaveBeenCalledTimes(1);
    
    vi.useRealTimers();
  });

  it('animates frames over time', () => {
    vi.useFakeTimers();
    const { frames } = render(<SplashScreen />);
    
    const frame1 = frames[0];
    
    // Advance time to trigger animation
    vi.advanceTimersByTime(300);
    
    const frame2 = frames[frames.length - 1];
    
    // Frames should be different (animation occurred)
    expect(frame1).not.toEqual(frame2);
    
    vi.useRealTimers();
  });
});
```

#### 2. Update App Component Tests
**File**: `.ralph/tui/src/app.test.tsx`
**Changes**: Add splash screen test

Add new test case:
```typescript
it('shows splash screen on initial load', async () => {
  vi.useFakeTimers();
  
  const { lastFrame } = render(
    <App jsonlPath="/test.jsonl" issueId={null} showSidebar={false} />
  );
  
  // Should show splash initially
  expect(lastFrame()).toContain('Initializing Ralph TUI');
  
  // Advance past splash duration
  vi.advanceTimersByTime(2100);
  
  // Should show main interface after splash
  expect(lastFrame()).not.toContain('Initializing Ralph TUI');
  
  vi.useRealTimers();
});
```

### Success Criteria:

#### Automated Verification:
- [ ] All new tests pass: `pnpm test:run`
- [ ] Test coverage maintained or improved: `pnpm test:coverage`
- [ ] No test failures in existing tests
- [ ] Build passes: `pnpm build`

#### Manual Verification:
- [ ] Splash screen works correctly in development mode: `pnpm dev:tsx`
- [ ] Splash screen works in production build: `pnpm build && pnpm start`
- [ ] No console errors or warnings during splash
- [ ] Smooth visual transition from splash to main UI

---

## Testing Strategy

### Unit Tests:
- Splash screen component renders correctly
- Animation frames cycle as expected
- Timer completes after exactly 2 seconds
- onComplete callback is invoked
- App component transitions from splash to main view

### Integration Tests:
- Full startup sequence from CLI through splash to main UI
- Splash doesn't interfere with JSONL file loading
- Process management hooks work correctly after splash

### Manual Testing Steps:
1. Run `pnpm dev:tsx` from `.ralph/tui/` directory
2. Observe splash screen appears immediately on launch
3. Verify ASCII art animates smoothly (letter highlighting effect)
4. Confirm loading dots animate (0-3 dots cycling)
5. Count 2 seconds and verify automatic transition
6. Ensure main UI loads normally after splash
7. Test with existing JSONL file to ensure data loads
8. Test with Ralph process running to ensure no conflicts

## Performance Considerations

- Animation uses 300ms intervals (slower than spinner's 80ms) for better readability of ASCII art
- Only 6 frames stored in memory (minimal footprint)
- Component unmounts cleanly after 2 seconds, freeing resources
- No impact on JSONL file loading as it happens in parallel
- Timer cleanup prevents memory leaks

## Assumptions Made

1. **Fixed 2-second duration**: No configuration option needed as the brief duration is appropriate for all users
2. **Always show splash**: Splash appears on every launch, not just first run
3. **No skip functionality**: 2 seconds is brief enough that skip isn't necessary
4. **Animation style**: Letter-by-letter highlighting chosen over other effects for clarity

## References

- Task definition: `.ai-docs/thoughts/plans/splash-screen/task.md`
- Research doc: `.ai-docs/thoughts/plans/splash-screen/research.md`
- Similar animation: `.ralph/tui/src/components/common/spinner.tsx:22-39`
- Existing ASCII art: `.ralph/tui/src/components/start-screen.tsx:6-13`
- App component: `.ralph/tui/src/app.tsx:39`
- Entry point: `.ralph/tui/src/cli.tsx:169`