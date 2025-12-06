---
name: ink-tui
description: Build terminal user interfaces (TUIs) using Ink, the React renderer for CLIs. This skill should be used when creating interactive command-line applications, CLI tools with rich UIs, terminal dashboards, or any project requiring React-based terminal rendering. Covers project setup, components, hooks, layouts, input handling, testing, and the Ink ecosystem.
---

# Ink TUI Development

## Overview

Ink is a React renderer for building interactive command-line applications. Instead of rendering to the DOM, Ink renders React components to terminal-based UIs using Flexbox layouts via the Yoga engine. It's used in production by Claude Code, Gemini CLI, GitHub Copilot CLI, Prisma, Gatsby, and Cloudflare Wrangler.

## Quick Start

### Project Setup

To create a new Ink project with TypeScript:

```bash
npx create-ink-app --typescript my-cli
cd my-cli
npm link  # Makes CLI globally available
```

This creates a ready-to-use project structure:

```
my-cli/
├── dist/                 # Compiled output
├── src/
│   ├── cli.tsx          # Entry point with shebang
│   ├── ui.tsx           # Main React component
│   └── test.tsx         # Test file
├── package.json         # Includes "bin" for executable
└── tsconfig.json
```

### Manual Setup (Alternative)

```bash
npm init -y
npm install ink react
npm install --save-dev typescript @types/react
```

Configure `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "jsx": "react",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

Add to `package.json`:

```json
{
  "bin": {
    "my-cli": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/cli.js"
  }
}
```

### Entry Point Pattern

Create `src/cli.tsx`:

```typescript
#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import App from './ui.js';

render(<App />);
```

## Core Components

### `<Text>` - All Text Output

All terminal text must be wrapped in `<Text>`. Direct strings cause errors.

```typescript
import {Text} from 'ink';

// Basic text
<Text>Hello World</Text>

// Styled text
<Text color="green" bold>Success!</Text>
<Text color="#ff0000">Hex color</Text>
<Text backgroundColor="blue" inverse>Inverted</Text>

// Text wrapping
<Text wrap="truncate">Very long text that gets truncated...</Text>
<Text wrap="truncate-middle">...middle truncation...</Text>
```

**Text Props:**
- `color` / `backgroundColor`: Named colors, hex, or RGB
- `bold`, `italic`, `underline`, `strikethrough`: Boolean styling
- `dimColor`: Reduces brightness
- `inverse`: Swaps foreground/background
- `wrap`: `"wrap"` | `"truncate"` | `"truncate-start"` | `"truncate-middle"` | `"truncate-end"`

### `<Box>` - Layout Container

The primary layout component using Flexbox.

```typescript
import {Box, Text} from 'ink';

// Column layout (default)
<Box flexDirection="column">
  <Text>Row 1</Text>
  <Text>Row 2</Text>
</Box>

// Row layout
<Box flexDirection="row">
  <Text>Column 1</Text>
  <Text>Column 2</Text>
</Box>

// Styled container
<Box
  borderStyle="round"
  borderColor="green"
  padding={1}
  width={40}
>
  <Text>Bordered content</Text>
</Box>
```

**Layout Props:**
- `flexDirection`: `"row"` | `"column"` | `"row-reverse"` | `"column-reverse"`
- `justifyContent`: `"flex-start"` | `"center"` | `"flex-end"` | `"space-between"` | `"space-around"`
- `alignItems`: `"flex-start"` | `"center"` | `"flex-end"` | `"stretch"`
- `width`, `height`, `minWidth`, `minHeight`: Dimensions
- `padding`, `paddingX`, `paddingY`, `paddingLeft/Right/Top/Bottom`: Spacing
- `margin`, `marginX`, `marginY`, `marginLeft/Right/Top/Bottom`: Outer spacing
- `borderStyle`: `"single"` | `"double"` | `"round"` | `"bold"` | `"classic"`
- `borderColor`: Color for borders

### `<Static>` - Non-Updating Content

Renders content that stays fixed while other content updates. Essential for performance with logs or completed items.

```typescript
import {Static, Box, Text} from 'ink';

const App = () => {
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  return (
    <>
      <Static items={completedTasks}>
        {task => <Text key={task} color="green">✓ {task}</Text>}
      </Static>
      <Box>
        <Text>Currently working on: {currentTask}</Text>
      </Box>
    </>
  );
};
```

### Other Components

```typescript
import {Newline, Spacer} from 'ink';

// Line break
<Text>Line 1</Text>
<Newline />
<Text>Line 2</Text>

// Flexible space (expands to fill)
<Box flexDirection="row">
  <Text>Left</Text>
  <Spacer />
  <Text>Right</Text>
</Box>
```

## Hooks

### `useInput` - Keyboard Input

```typescript
import {useInput, useApp} from 'ink';

const App = () => {
  const {exit} = useApp();
  const [selected, setSelected] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) setSelected(s => Math.max(0, s - 1));
    if (key.downArrow) setSelected(s => s + 1);
    if (key.return) handleSelect();
    if (input === 'q' || key.escape) exit();
    if (key.ctrl && input === 'c') exit();
  });

  return <Text>Selected: {selected}</Text>;
};
```

**Key Object Properties:**
- Arrow keys: `upArrow`, `downArrow`, `leftArrow`, `rightArrow`
- Modifiers: `ctrl`, `shift`, `meta`
- Special: `return`, `escape`, `tab`, `backspace`, `delete`

### `useApp` - Application Control

```typescript
import {useApp} from 'ink';

const App = () => {
  const {exit} = useApp();

  const handleComplete = () => {
    console.log('Done!');
    exit();  // Terminates the CLI
  };
};
```

### `useFocus` & `useFocusManager` - Focus Management

```typescript
import {useFocus, useFocusManager, Box, Text} from 'ink';

const Input = ({id, label}: {id: string; label: string}) => {
  const {isFocused} = useFocus({id});

  return (
    <Box>
      <Text color={isFocused ? 'green' : 'white'}>
        {isFocused ? '> ' : '  '}{label}
      </Text>
    </Box>
  );
};

const App = () => {
  const {focus} = useFocusManager();

  // Programmatically focus
  useEffect(() => {
    focus('input-1');
  }, []);

  return (
    <Box flexDirection="column">
      <Input id="input-1" label="First Input" />
      <Input id="input-2" label="Second Input" />
      <Text dimColor>Tab to navigate</Text>
    </Box>
  );
};
```

### Stream Hooks

```typescript
import {useStdin, useStdout, useStderr} from 'ink';

const App = () => {
  const {stdin, isRawModeSupported} = useStdin();
  const {stdout, write} = useStdout();
  const {stderr} = useStderr();

  // write() bypasses Ink for direct output
  write('Direct terminal output\n');
};
```

## Common Patterns

### Interactive List

```typescript
import React, {useState} from 'react';
import {Box, Text, useInput, useApp} from 'ink';

interface Item {
  label: string;
  value: string;
}

const SelectList = ({items, onSelect}: {items: Item[]; onSelect: (item: Item) => void}) => {
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor(c => (c > 0 ? c - 1 : items.length - 1));
    }
    if (key.downArrow) {
      setCursor(c => (c < items.length - 1 ? c + 1 : 0));
    }
    if (key.return) {
      onSelect(items[cursor]);
    }
  });

  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <Text key={item.value} color={i === cursor ? 'green' : 'white'}>
          {i === cursor ? '> ' : '  '}{item.label}
        </Text>
      ))}
    </Box>
  );
};
```

### Loading Spinner

```typescript
import React, {useState, useEffect} from 'react';
import {Text} from 'ink';

const Spinner = () => {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(f => (f + 1) % frames.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return <Text color="cyan">{frames[frame]}</Text>;
};
```

### Two-Column Layout

```typescript
const TwoColumn = () => (
  <Box flexDirection="row" width={80}>
    <Box flexDirection="column" width="50%" paddingRight={1}>
      <Text bold>Left Panel</Text>
      <Text>Content here</Text>
    </Box>
    <Box
      flexDirection="column"
      width="50%"
      borderStyle="single"
      borderColor="gray"
      paddingLeft={1}
    >
      <Text bold>Right Panel</Text>
      <Text>More content</Text>
    </Box>
  </Box>
);
```

### Progress Bar

```typescript
const ProgressBar = ({percent, width = 40}: {percent: number; width?: number}) => {
  const filled = Math.round(width * (percent / 100));
  const empty = width - filled;

  return (
    <Box>
      <Text color="green">{'█'.repeat(filled)}</Text>
      <Text color="gray">{'░'.repeat(empty)}</Text>
      <Text> {percent}%</Text>
    </Box>
  );
};
```

## Companion Libraries

### Input Components

```bash
npm install ink-text-input ink-select-input ink-spinner
```

```typescript
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

// Text input
const [value, setValue] = useState('');
<TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />

// Select input
const items = [
  {label: 'First', value: 'first'},
  {label: 'Second', value: 'second'},
];
<SelectInput items={items} onSelect={item => console.log(item.value)} />

// Spinner
<Text><Spinner type="dots" /> Loading...</Text>
```

### @inkjs/ui - Comprehensive UI Kit

```bash
npm install @inkjs/ui
```

```typescript
import {TextInput, Select, Spinner, ProgressBar, Badge, Alert} from '@inkjs/ui';

<TextInput placeholder="Enter name..." onSubmit={handleSubmit} />
<Select options={options} onChange={handleChange} />
<Spinner label="Processing..." />
<ProgressBar value={50} />
<Badge color="green">Success</Badge>
<Alert variant="error">Something went wrong</Alert>
```

### Visual Components

```bash
npm install ink-big-text ink-gradient ink-link
```

```typescript
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import Link from 'ink-link';

<BigText text="Hello" font="block" />
<Gradient name="rainbow"><Text>Colorful text</Text></Gradient>
<Link url="https://example.com">Click here</Link>
```

## Testing

### Setup

```bash
npm install --save-dev ink-testing-library
```

### Basic Testing

```typescript
import React from 'react';
import {render} from 'ink-testing-library';
import App from './ui.js';

describe('App', () => {
  it('renders greeting', () => {
    const {lastFrame} = render(<App name="World" />);
    expect(lastFrame()).toContain('Hello World');
  });

  it('handles keyboard input', () => {
    const {lastFrame, stdin} = render(<App />);

    // Simulate arrow key
    stdin.write('\x1B[A');  // Up arrow
    expect(lastFrame()).toContain('Selected: 1');

    // Simulate text input
    stdin.write('hello');
    expect(lastFrame()).toContain('hello');

    // Simulate Enter
    stdin.write('\r');
  });

  it('re-renders with new props', () => {
    const {lastFrame, rerender} = render(<Counter count={0} />);
    expect(lastFrame()).toContain('Count: 0');

    rerender(<Counter count={5} />);
    expect(lastFrame()).toContain('Count: 5');
  });
});
```

### Key Escape Sequences

```typescript
const keys = {
  up: '\x1B[A',
  down: '\x1B[B',
  left: '\x1B[D',
  right: '\x1B[C',
  enter: '\r',
  escape: '\x1B',
  tab: '\t',
  backspace: '\x7F',
};
```

## CLI Argument Parsing

### With Commander (Recommended for TypeScript)

```bash
npm install commander
```

```typescript
#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import {Command} from 'commander';
import App from './ui.js';

const program = new Command();

program
  .name('my-cli')
  .description('My CLI application')
  .version('1.0.0')
  .option('-n, --name <name>', 'Your name', 'World')
  .option('-c, --count <number>', 'Count', '1')
  .action((options) => {
    render(<App name={options.name} count={parseInt(options.count)} />);
  });

program.parse();
```

### With Meow

```bash
npm install meow
```

```typescript
#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './ui.js';

const cli = meow(`
  Usage
    $ my-cli <name>

  Options
    --count, -c  Number of times to greet

  Examples
    $ my-cli World --count 3
`, {
  importMeta: import.meta,
  flags: {
    count: {
      type: 'number',
      shortFlag: 'c',
      default: 1
    }
  }
});

render(<App name={cli.input[0] || 'World'} count={cli.flags.count} />);
```

## Best Practices

### Performance
- Use `<Static>` for completed/historical content that doesn't need re-rendering
- Minimize state updates to reduce re-renders
- Clean up timers and subscriptions in `useEffect` cleanup functions

### Layout
- Every element is Flexbox by default (`display: flex`)
- Use nested `<Box>` components for complex layouts
- Set explicit `width` on containers for consistent sizing

### Input Handling
- Always call `useInput` to prevent immediate process exit
- Use `useApp().exit()` for clean termination
- Implement focus management for multiple interactive elements

### Error Handling
- Wrap render in try/catch for graceful error display
- Use `process.exit(1)` for error exits after cleanup

### TypeScript
- Use `FC<Props>` for component typing
- Enable strict mode in tsconfig
- Prefer Commander over Meow for better type inference

## Advanced Patterns

### View Navigation (State-Based Routing)

Ink has no built-in router. Use state-based navigation:

```typescript
type View = 'main' | 'detail' | 'settings';

const App = () => {
  const [currentView, setCurrentView] = useState<View>('main');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useInput((input, key) => {
    if (key.escape && currentView !== 'main') {
      setCurrentView('main');
      setSelectedItem(null);
    }
  });

  return (
    <Box flexDirection="column">
      {currentView === 'main' && (
        <MainView
          onSelect={(item) => {
            setSelectedItem(item);
            setCurrentView('detail');
          }}
        />
      )}
      {currentView === 'detail' && selectedItem && (
        <DetailView item={selectedItem} onBack={() => setCurrentView('main')} />
      )}
      {currentView === 'settings' && (
        <SettingsView onBack={() => setCurrentView('main')} />
      )}
    </Box>
  );
};
```

### Tabbed Interface

```typescript
const TabbedView = () => {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['Messages', 'Tools', 'BD Issue', 'Todos'];

  useInput((input, key) => {
    if (key.tab && !key.shift) {
      setActiveTab(t => (t + 1) % tabs.length);
    }
    if (key.tab && key.shift) {
      setActiveTab(t => (t - 1 + tabs.length) % tabs.length);
    }
    // Number keys for direct access
    const num = parseInt(input);
    if (num >= 1 && num <= tabs.length) {
      setActiveTab(num - 1);
    }
  });

  return (
    <Box flexDirection="column">
      {/* Tab Headers */}
      <Box flexDirection="row" borderStyle="single" borderBottom>
        {tabs.map((tab, i) => (
          <Box key={tab} paddingX={2}>
            <Text
              color={i === activeTab ? 'green' : 'white'}
              bold={i === activeTab}
              inverse={i === activeTab}
            >
              {i + 1}. {tab}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Tab Content */}
      <Box flexGrow={1}>
        {activeTab === 0 && <MessagesTab />}
        {activeTab === 1 && <ToolsTab />}
        {activeTab === 2 && <BDIssueTab />}
        {activeTab === 3 && <TodosTab />}
      </Box>
    </Box>
  );
};
```

### Scrollable List with Windowed Rendering

Terminal scrolling requires "windowed" rendering (showing a subset of items):

```typescript
interface ScrollableListProps<T> {
  items: T[];
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  windowSize?: number;
  onSelect?: (item: T) => void;
}

const ScrollableList = <T,>({
  items,
  renderItem,
  windowSize = 10,
  onSelect,
}: ScrollableListProps<T>) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      const newIndex = Math.max(0, selectedIndex - 1);
      setSelectedIndex(newIndex);
      // Scroll window up if needed
      if (newIndex < windowStart) {
        setWindowStart(newIndex);
      }
    }
    if (key.downArrow) {
      const newIndex = Math.min(items.length - 1, selectedIndex + 1);
      setSelectedIndex(newIndex);
      // Scroll window down if needed
      if (newIndex >= windowStart + windowSize) {
        setWindowStart(newIndex - windowSize + 1);
      }
    }
    if (key.pageUp) {
      const newIndex = Math.max(0, selectedIndex - windowSize);
      setSelectedIndex(newIndex);
      setWindowStart(Math.max(0, windowStart - windowSize));
    }
    if (key.pageDown) {
      const newIndex = Math.min(items.length - 1, selectedIndex + windowSize);
      setSelectedIndex(newIndex);
      setWindowStart(Math.min(items.length - windowSize, windowStart + windowSize));
    }
    if (key.return && onSelect) {
      onSelect(items[selectedIndex]);
    }
  });

  const visibleItems = items.slice(windowStart, windowStart + windowSize);
  const showScrollUp = windowStart > 0;
  const showScrollDown = windowStart + windowSize < items.length;

  return (
    <Box flexDirection="column">
      {showScrollUp && <Text dimColor>↑ {windowStart} more above</Text>}
      {visibleItems.map((item, i) => {
        const actualIndex = windowStart + i;
        return (
          <Box key={actualIndex}>
            {renderItem(item, actualIndex === selectedIndex)}
          </Box>
        );
      })}
      {showScrollDown && (
        <Text dimColor>↓ {items.length - windowStart - windowSize} more below</Text>
      )}
    </Box>
  );
};
```

### File Watching Integration

```typescript
import {useEffect, useState} from 'react';
import * as fs from 'fs';
import * as chokidar from 'chokidar';

const useFileWatcher = (filePath: string) => {
  const [content, setContent] = useState<string | null>(null);
  const [lastModified, setLastModified] = useState<Date | null>(null);

  useEffect(() => {
    // Initial read
    const readFile = () => {
      try {
        const data = fs.readFileSync(filePath, 'utf-8');
        setContent(data);
        setLastModified(new Date());
      } catch (err) {
        setContent(null);
      }
    };
    readFile();

    // Watch for changes
    const watcher = chokidar.watch(filePath, {
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('change', readFile);
    watcher.on('add', readFile);

    return () => {
      watcher.close();
    };
  }, [filePath]);

  return {content, lastModified};
};

// Usage for JSONL streaming
const useJSONLStream = (filePath: string) => {
  const [entries, setEntries] = useState<object[]>([]);
  const [tailPosition, setTailPosition] = useState(0);

  useEffect(() => {
    const watcher = chokidar.watch(filePath);

    const readNewEntries = () => {
      const fd = fs.openSync(filePath, 'r');
      const stats = fs.fstatSync(fd);

      if (stats.size > tailPosition) {
        const buffer = Buffer.alloc(stats.size - tailPosition);
        fs.readSync(fd, buffer, 0, buffer.length, tailPosition);
        const newContent = buffer.toString('utf-8');

        const newEntries = newContent
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));

        setEntries(prev => [...prev, ...newEntries]);
        setTailPosition(stats.size);
      }

      fs.closeSync(fd);
    };

    watcher.on('change', readNewEntries);
    readNewEntries(); // Initial read

    return () => watcher.close();
  }, [filePath]);

  return entries;
};
```

### Side Panel Layout

```typescript
const SidePanelLayout = ({
  main,
  sidebar,
  sidebarWidth = 30,
  sidebarPosition = 'right',
}: {
  main: React.ReactNode;
  sidebar: React.ReactNode;
  sidebarWidth?: number;
  sidebarPosition?: 'left' | 'right';
}) => {
  const mainContent = (
    <Box flexDirection="column" flexGrow={1} paddingRight={sidebarPosition === 'right' ? 1 : 0}>
      {main}
    </Box>
  );

  const sidebarContent = (
    <Box
      flexDirection="column"
      width={sidebarWidth}
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
      {sidebar}
    </Box>
  );

  return (
    <Box flexDirection="row" width="100%">
      {sidebarPosition === 'left' ? sidebarContent : mainContent}
      {sidebarPosition === 'left' ? mainContent : sidebarContent}
    </Box>
  );
};
```

### Breadcrumb Navigation

```typescript
const Breadcrumb = ({path, onNavigate}: {path: string[]; onNavigate: (index: number) => void}) => (
  <Box flexDirection="row" marginBottom={1}>
    {path.map((segment, i) => (
      <React.Fragment key={i}>
        {i > 0 && <Text dimColor> › </Text>}
        <Text
          color={i === path.length - 1 ? 'green' : 'blue'}
          bold={i === path.length - 1}
          underline={i < path.length - 1}
        >
          {segment}
        </Text>
      </React.Fragment>
    ))}
  </Box>
);
```

## Resources

For detailed component API documentation, see `references/component-api.md`.

For a starter project template, copy from `assets/starter-template/`.
