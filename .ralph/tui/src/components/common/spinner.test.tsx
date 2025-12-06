import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Spinner } from './spinner.js';

describe('Spinner', () => {
  it('renders spinner without label when no label provided', () => {
    const { lastFrame } = render(<Spinner />);
    
    // Should render spinner character (from dots frames)
    const frame = lastFrame() || '';
    expect(frame).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/);
  });

  it('renders with custom label', () => {
    const { lastFrame } = render(<Spinner label="Processing data..." />);
    
    expect(lastFrame()).toContain('Processing data...');
  });

  it('renders with custom color', () => {
    const { lastFrame } = render(<Spinner label="Test" color="red" />);
    
    // The frame should contain the label
    expect(lastFrame()).toContain('Test');
    // Note: Color testing in ink-testing-library is limited
  });

  it('renders spinner animation frames', () => {
    const { frames } = render(<Spinner label="Loading" />);
    
    // Should have multiple frames for animation
    expect(frames.length).toBeGreaterThan(0);
    
    // Each frame should contain the label
    frames.forEach(frame => {
      expect(frame).toContain('Loading');
    });
  });
});