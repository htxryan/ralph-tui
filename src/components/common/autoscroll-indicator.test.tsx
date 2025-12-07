import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { AutoscrollIndicator } from './autoscroll-indicator.js';

describe('AutoscrollIndicator', () => {
  it('renders nothing when not scrollable', () => {
    const { lastFrame } = render(
      <AutoscrollIndicator isFollowing={true} isScrollable={false} />
    );
    expect(lastFrame()).toBe('');
  });

  it('renders nothing when not scrollable and not following', () => {
    const { lastFrame } = render(
      <AutoscrollIndicator isFollowing={false} isScrollable={false} />
    );
    expect(lastFrame()).toBe('');
  });

  it('shows autoscrolling message when following and scrollable', () => {
    const { lastFrame } = render(
      <AutoscrollIndicator isFollowing={true} isScrollable={true} />
    );
    expect(lastFrame()).toContain('Autoscrolling');
  });

  it('shows paused message with shortcut when not following and scrollable', () => {
    const { lastFrame } = render(
      <AutoscrollIndicator isFollowing={false} isScrollable={true} />
    );
    expect(lastFrame()).toContain('Autoscrolling paused');
    expect(lastFrame()).toContain('Press L to resume');
  });

  it('does not show shortcut hint when following', () => {
    const { lastFrame } = render(
      <AutoscrollIndicator isFollowing={true} isScrollable={true} />
    );
    expect(lastFrame()).not.toContain('Press L');
  });
});
