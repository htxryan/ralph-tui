# Ink Component API Reference

Detailed API documentation for Ink components and hooks.

## Components

### `<Text>`

Renders text with optional styling. All text in Ink must be wrapped in a `<Text>` component.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `string` | - | Text color. Accepts: named colors (`red`, `green`, `blue`, etc.), hex (`#ff0000`), RGB (`rgb(255,0,0)`), or ANSI codes |
| `backgroundColor` | `string` | - | Background color. Same format as `color` |
| `dimColor` | `boolean` | `false` | Dim the color (reduce brightness) |
| `bold` | `boolean` | `false` | Bold text |
| `italic` | `boolean` | `false` | Italic text |
| `underline` | `boolean` | `false` | Underlined text |
| `strikethrough` | `boolean` | `false` | Strikethrough text |
| `inverse` | `boolean` | `false` | Swap foreground and background colors |
| `wrap` | `string` | `"wrap"` | Text wrapping behavior: `"wrap"`, `"truncate"`, `"truncate-start"`, `"truncate-middle"`, `"truncate-end"` |

#### Named Colors

`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, `grey`, `blackBright`, `redBright`, `greenBright`, `yellowBright`, `blueBright`, `magentaBright`, `cyanBright`, `whiteBright`

---

### `<Box>`

Layout container using Flexbox. All layout props mirror CSS Flexbox properties.

#### Dimension Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `number \| string` | - | Width in columns or percentage |
| `height` | `number \| string` | - | Height in rows or percentage |
| `minWidth` | `number` | - | Minimum width |
| `minHeight` | `number` | - | Minimum height |

#### Padding Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `padding` | `number` | `0` | Padding on all sides |
| `paddingX` | `number` | `0` | Horizontal padding (left and right) |
| `paddingY` | `number` | `0` | Vertical padding (top and bottom) |
| `paddingTop` | `number` | `0` | Top padding |
| `paddingBottom` | `number` | `0` | Bottom padding |
| `paddingLeft` | `number` | `0` | Left padding |
| `paddingRight` | `number` | `0` | Right padding |

#### Margin Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `margin` | `number` | `0` | Margin on all sides |
| `marginX` | `number` | `0` | Horizontal margin |
| `marginY` | `number` | `0` | Vertical margin |
| `marginTop` | `number` | `0` | Top margin |
| `marginBottom` | `number` | `0` | Bottom margin |
| `marginLeft` | `number` | `0` | Left margin |
| `marginRight` | `number` | `0` | Right margin |

#### Flexbox Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `flexDirection` | `string` | `"column"` | `"row"`, `"column"`, `"row-reverse"`, `"column-reverse"` |
| `flexGrow` | `number` | `0` | Flex grow factor |
| `flexShrink` | `number` | `1` | Flex shrink factor |
| `flexBasis` | `number \| string` | - | Initial size before growing/shrinking |
| `flex` | `number` | - | Shorthand for flexGrow |
| `alignItems` | `string` | `"stretch"` | `"flex-start"`, `"center"`, `"flex-end"`, `"stretch"` |
| `alignSelf` | `string` | - | Override alignItems for this element |
| `justifyContent` | `string` | `"flex-start"` | `"flex-start"`, `"center"`, `"flex-end"`, `"space-between"`, `"space-around"` |
| `flexWrap` | `string` | `"nowrap"` | `"nowrap"`, `"wrap"`, `"wrap-reverse"` |

#### Border Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `borderStyle` | `string \| object` | - | Border style: `"single"`, `"double"`, `"round"`, `"bold"`, `"singleDouble"`, `"doubleSingle"`, `"classic"`, `"arrow"`, `"none"` |
| `borderColor` | `string` | - | Border color |
| `borderTop` | `boolean` | `true` | Show top border (when borderStyle set) |
| `borderBottom` | `boolean` | `true` | Show bottom border |
| `borderLeft` | `boolean` | `true` | Show left border |
| `borderRight` | `boolean` | `true` | Show right border |

#### Other Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `display` | `string` | `"flex"` | `"flex"` or `"none"` |
| `overflow` | `string` | `"visible"` | `"visible"` or `"hidden"` |

---

### `<Static>`

Renders a list of items that won't re-render. Useful for logs, completed tasks, or any output that should remain static.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `T[]` | Yes | Array of items to render |
| `children` | `(item: T, index: number) => ReactNode` | Yes | Render function for each item |
| `style` | `object` | No | Style object passed to wrapper |

---

### `<Newline>`

Renders a newline character. Equivalent to `\n` but more explicit in JSX.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `count` | `number` | `1` | Number of newlines to render |

---

### `<Spacer>`

Flexible spacer that expands to fill available space. Equivalent to `<Box flexGrow={1} />`.

No props.

---

### `<Transform>`

Applies a transformation function to all text within its children.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `transform` | `(children: string, index: number) => string` | Yes | Transformation function |

---

## Hooks

### `useInput(handler, options?)`

Listens for user input.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `handler` | `(input: string, key: Key) => void` | Callback for input events |
| `options.isActive` | `boolean` | Whether the hook is active (default: `true`) |

#### Key Object

```typescript
interface Key {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  pageDown: boolean;
  pageUp: boolean;
  return: boolean;
  escape: boolean;
  ctrl: boolean;
  shift: boolean;
  tab: boolean;
  backspace: boolean;
  delete: boolean;
  meta: boolean;
}
```

---

### `useApp()`

Access to the Ink app instance.

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `exit` | `(error?: Error) => void` | Exit the app |

---

### `useFocus(options?)`

Makes a component focusable.

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `autoFocus` | `boolean` | Focus on mount (default: `false`) |
| `isActive` | `boolean` | Whether focus is enabled (default: `true`) |
| `id` | `string` | Unique identifier for focus |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `isFocused` | `boolean` | Whether this component has focus |

---

### `useFocusManager()`

Programmatic focus control.

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `enableFocus` | `() => void` | Enable focus system |
| `disableFocus` | `() => void` | Disable focus system |
| `focusNext` | `() => void` | Move focus to next element |
| `focusPrevious` | `() => void` | Move focus to previous element |
| `focus` | `(id: string) => void` | Focus specific element by ID |

---

### `useStdin()`

Access to stdin stream.

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `stdin` | `ReadableStream` | The stdin stream |
| `isRawModeSupported` | `boolean` | Whether raw mode is supported |
| `setRawMode` | `(value: boolean) => void` | Enable/disable raw mode |

---

### `useStdout()`

Access to stdout stream.

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `stdout` | `WritableStream` | The stdout stream |
| `write` | `(data: string) => void` | Write directly to stdout |

---

### `useStderr()`

Access to stderr stream.

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `stderr` | `WritableStream` | The stderr stream |
| `write` | `(data: string) => void` | Write directly to stderr |

---

## render() Function

The main function to render an Ink app.

```typescript
import {render} from 'ink';

const {
  rerender,    // Re-render with new element
  unmount,     // Unmount the app
  waitUntilExit, // Promise that resolves when app exits
  cleanup,     // Manual cleanup
  clear        // Clear output
} = render(<App />, options?);
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stdout` | `WritableStream` | `process.stdout` | Output stream |
| `stdin` | `ReadableStream` | `process.stdin` | Input stream |
| `stderr` | `WritableStream` | `process.stderr` | Error stream |
| `debug` | `boolean` | `false` | Enable debug mode |
| `exitOnCtrlC` | `boolean` | `true` | Exit on Ctrl+C |
| `patchConsole` | `boolean` | `true` | Patch console methods |

---

## Companion Libraries Quick Reference

### ink-text-input

```typescript
import TextInput from 'ink-text-input';

<TextInput
  value={string}
  onChange={(value: string) => void}
  onSubmit={(value: string) => void}
  placeholder={string}
  focus={boolean}
  mask={string}  // Mask character for passwords
  showCursor={boolean}
/>
```

### ink-select-input

```typescript
import SelectInput from 'ink-select-input';

<SelectInput
  items={Array<{label: string, value: any}>}
  onSelect={(item) => void}
  onHighlight={(item) => void}
  initialIndex={number}
  limit={number}  // Visible items
  indicatorComponent={Component}
  itemComponent={Component}
/>
```

### ink-spinner

```typescript
import Spinner from 'ink-spinner';

<Spinner type="dots" />  // dots, line, arc, etc.
```

### @inkjs/ui

```typescript
import {
  TextInput,
  PasswordInput,
  EmailInput,
  ConfirmInput,
  Select,
  MultiSelect,
  Spinner,
  ProgressBar,
  Badge,
  StatusMessage,
  Alert,
  UnorderedList,
  OrderedList
} from '@inkjs/ui';
```
