import React from 'react';
import {render} from 'ink-testing-library';
import App from './ui.js';

describe('App', () => {
  it('renders greeting with default name', () => {
    const {lastFrame} = render(<App />);
    expect(lastFrame()).toContain('Hello, World!');
  });

  it('renders greeting with custom name', () => {
    const {lastFrame} = render(<App name="Test" />);
    expect(lastFrame()).toContain('Hello, Test!');
  });

  it('shows initial counter value', () => {
    const {lastFrame} = render(<App />);
    expect(lastFrame()).toContain('Counter:');
    expect(lastFrame()).toContain('0');
  });

  it('increments counter on up arrow', () => {
    const {lastFrame, stdin} = render(<App />);
    stdin.write('\x1B[A'); // Up arrow
    expect(lastFrame()).toContain('1');
  });

  it('decrements counter on down arrow', () => {
    const {lastFrame, stdin} = render(<App />);
    stdin.write('\x1B[A'); // Up arrow (to 1)
    stdin.write('\x1B[A'); // Up arrow (to 2)
    stdin.write('\x1B[B'); // Down arrow (to 1)
    expect(lastFrame()).toContain('1');
  });

  it('does not go below zero', () => {
    const {lastFrame, stdin} = render(<App />);
    stdin.write('\x1B[B'); // Down arrow
    expect(lastFrame()).toContain('0');
  });
});
