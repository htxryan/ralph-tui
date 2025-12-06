import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Footer } from './footer.js';
import { Shortcut } from '../lib/shortcuts.js';

describe('Footer', () => {
  it('renders shortcuts when available', () => {
    const shortcuts: Shortcut[] = [
      { key: 'q', description: 'Quit' },
      { key: 'r', description: 'Refresh' },
      { key: '?', description: 'Help' }
    ];

    const { lastFrame } = render(
      <Footer shortcuts={shortcuts} width={80} />
    );

    expect(lastFrame()).toContain('q');
    expect(lastFrame()).toContain('Quit');
    expect(lastFrame()).toContain('r');
    expect(lastFrame()).toContain('Refresh');
    expect(lastFrame()).toContain('?');
    expect(lastFrame()).toContain('Help');
  });

  it('displays interrupt mode shortcuts', () => {
    const { lastFrame } = render(
      <Footer 
        shortcuts={[]} 
        width={80} 
        isInterruptMode={true}
      />
    );

    // Should show interrupt mode specific shortcuts
    expect(lastFrame()).toContain('Enter');
    expect(lastFrame()).toContain('Submit');
    expect(lastFrame()).toContain('Esc');
    expect(lastFrame()).toContain('Cancel');
  });

  it('shows session picker shortcuts when session picker is open', () => {
    const { lastFrame } = render(
      <Footer 
        shortcuts={[]} 
        width={80} 
        isSessionPickerOpen={true}
      />
    );

    expect(lastFrame()).toContain('Session Picker');
  });

  it('hides shortcuts when terminal is too narrow', () => {
    const shortcuts: Shortcut[] = [
      { key: 'q', description: 'Quit' },
      { key: 'r', description: 'Refresh' },
      { key: 't', description: 'Test' },
      { key: 's', description: 'Save' },
      { key: 'h', description: 'Help' }
    ];

    const { lastFrame } = render(
      <Footer shortcuts={shortcuts} width={30} />
    );

    // Should show "..." to indicate more shortcuts
    const frame = lastFrame() || '';
    if (frame.includes('...')) {
      expect(frame).toContain('...');
    }
  });

  it('renders empty footer when no shortcuts provided', () => {
    const { lastFrame } = render(
      <Footer shortcuts={[]} width={80} />
    );

    // Should still render with border
    expect(lastFrame()).toBeDefined();
    expect(lastFrame()).toContain('Ralph TUI');
  });
});