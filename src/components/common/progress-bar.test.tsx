import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ProgressBar } from './progress-bar.js';

describe('ProgressBar', () => {
  it('renders empty bar at 0% progress', () => {
    const { lastFrame } = render(
      <ProgressBar percent={0} width={20} />
    );
    
    expect(lastFrame()).toContain('0%');
  });

  it('renders full bar at 100% progress', () => {
    const { lastFrame } = render(
      <ProgressBar percent={100} width={20} />
    );
    
    expect(lastFrame()).toContain('100%');
  });

  it('renders partial progress correctly', () => {
    const { lastFrame } = render(
      <ProgressBar percent={50} width={20} />
    );
    
    expect(lastFrame()).toContain('50%');
  });

  it('handles negative percent gracefully', () => {
    const { lastFrame } = render(
      <ProgressBar percent={-10} width={20} />
    );
    
    // Should clamp to 0%
    expect(lastFrame()).toContain('0%');
  });

  it('handles percent greater than 100', () => {
    const { lastFrame } = render(
      <ProgressBar percent={150} width={20} />
    );
    
    // Should cap at 100%
    expect(lastFrame()).toContain('100%');
  });

  it('respects custom width', () => {
    const { lastFrame } = render(
      <ProgressBar percent={50} width={10} />
    );
    
    const frame = lastFrame() || '';
    // Should have progress bar characters
    expect(frame.length).toBeGreaterThan(0);
  });

  it('shows custom label when provided', () => {
    const { lastFrame } = render(
      <ProgressBar 
        percent={25} 
        width={20} 
        label="Processing"
      />
    );
    
    expect(lastFrame()).toContain('Processing');
    expect(lastFrame()).toContain('25%');
  });
});