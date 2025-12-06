#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import {Command} from 'commander';
import App from './ui.js';

const program = new Command();

program
  .name('my-cli')
  .description('My Ink CLI application')
  .version('1.0.0')
  .option('-n, --name <name>', 'Your name', 'World')
  .action((options) => {
    render(<App name={options.name} />);
  });

program.parse();
