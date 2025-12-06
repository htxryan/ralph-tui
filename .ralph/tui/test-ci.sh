#!/bin/bash

# CI Test Script for Ralph TUI
# This script runs all tests and ensures CI compatibility

set -e # Exit on error

echo "=== Ralph TUI CI Test Suite ==="
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "Error: Must be run from .ralph/tui directory"
  exit 1
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install --frozen-lockfile
fi

# Run TypeScript type checking
echo "🔍 Running type check..."
pnpm tsc --noEmit

# Run tests with coverage
echo "🧪 Running tests..."
pnpm test:run --reporter=verbose

# Check test results
if [ $? -eq 0 ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Tests failed"
  exit 1
fi

echo
echo "=== CI Test Suite Complete ==="