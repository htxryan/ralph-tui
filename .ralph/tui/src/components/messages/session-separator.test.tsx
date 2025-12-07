import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { SessionSeparator } from './session-separator.js';

describe('SessionSeparator', () => {
  const baseTimestamp = new Date('2024-01-15T10:30:00Z');

  it('renders previous session label', () => {
    const { lastFrame } = render(<SessionSeparator />);

    expect(lastFrame()).toContain('Previous Session');
  });

  it('shows end timestamp when provided', () => {
    const { lastFrame } = render(
      <SessionSeparator endedAt={baseTimestamp} />
    );

    expect(lastFrame()).toContain('Ended:');
    expect(lastFrame()).toContain('2024-01-15');
    // Time is shown in local timezone, so we just check for a time format
    expect(lastFrame()).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('shows start hint when showStartHint is true', () => {
    const { lastFrame } = render(
      <SessionSeparator showStartHint={true} />
    );

    expect(lastFrame()).toContain('Press');
    expect(lastFrame()).toContain('s');
    expect(lastFrame()).toContain('start a new session');
  });

  it('prioritizes start hint over end timestamp', () => {
    const { lastFrame } = render(
      <SessionSeparator endedAt={baseTimestamp} showStartHint={true} />
    );

    // Should show start hint, not ended timestamp
    expect(lastFrame()).toContain('start a new session');
    expect(lastFrame()).not.toContain('Ended:');
  });

  it('renders without secondary content when no props provided', () => {
    const { lastFrame } = render(<SessionSeparator />);

    // Should just show the main label
    expect(lastFrame()).toContain('Previous Session');
    expect(lastFrame()).not.toContain('Ended:');
  });

  describe('selection state', () => {
    it('renders with default border when not selected', () => {
      const { lastFrame } = render(
        <SessionSeparator isSelected={false} />
      );

      // Should render without error
      expect(lastFrame()).toContain('Previous Session');
    });

    it('renders with highlighted border when selected', () => {
      const { lastFrame } = render(
        <SessionSeparator isSelected={true} />
      );

      // Should render without error (border color change is visual)
      expect(lastFrame()).toContain('Previous Session');
    });
  });

  describe('arrow indicators', () => {
    it('shows up arrows indicating previous content', () => {
      const { lastFrame } = render(<SessionSeparator />);

      // Unicode up arrows
      expect(lastFrame()).toContain('↑');
    });
  });
});
