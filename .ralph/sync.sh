#!/usr/bin/env bash
#
# Sync: Run a single Claude iteration
#
# This script runs Claude once with the prompt and streams output
# to both a log file and the visualizer.
#

set -euo pipefail

# Export these so they're available in subshells (needed for timeout commands)
export SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
export PROMPT_FILE="$SCRIPT_DIR/prompt.md"
export LOG_FILE="$SCRIPT_DIR/claude_output.jsonl"

# Optional timeout (in seconds). Set to 0 for no timeout.
# Default: 2 hours (7200 seconds)
CLAUDE_TIMEOUT=${RALPH_CLAUDE_TIMEOUT:-7200}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[sync]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"
}

error() {
    echo -e "${RED}[sync]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    error "Prompt file not found: $PROMPT_FILE"
    exit 1
fi

log "Running Claude with prompt from: $PROMPT_FILE"
log "Output will be appended to: $LOG_FILE"
log "Working directory: $PROJECT_DIR"

if [ "$CLAUDE_TIMEOUT" -gt 0 ]; then
    log "Timeout: ${CLAUDE_TIMEOUT} seconds"
fi

cd "$PROJECT_DIR"

# Build the command
run_claude() {
    cat "$PROMPT_FILE" | \
        claude -p \
            --output-format=stream-json \
            --verbose \
            --dangerously-skip-permissions \
            --add-dir . | \
        tee -a "$LOG_FILE" | \
        uv run --no-project "$SCRIPT_DIR/visualize.py" --debug
}

# Run with or without timeout
if [ "$CLAUDE_TIMEOUT" -gt 0 ]; then
    if command -v timeout &> /dev/null; then
        # GNU coreutils timeout (Linux)
        timeout --signal=TERM "$CLAUDE_TIMEOUT" bash -c "$(declare -f run_claude); run_claude"
    elif command -v gtimeout &> /dev/null; then
        # GNU coreutils timeout via Homebrew (macOS)
        gtimeout --signal=TERM "$CLAUDE_TIMEOUT" bash -c "$(declare -f run_claude); run_claude"
    else
        # macOS without gtimeout - use a background job with manual timeout
        log "Note: Install 'coreutils' via Homebrew for better timeout support"
        run_claude &
        local pid=$!
        local count=0
        while kill -0 "$pid" 2>/dev/null; do
            sleep 1
            count=$((count + 1))
            if [ "$count" -ge "$CLAUDE_TIMEOUT" ]; then
                error "Claude process timed out after ${CLAUDE_TIMEOUT} seconds"
                kill -TERM "$pid" 2>/dev/null || true
                sleep 2
                kill -KILL "$pid" 2>/dev/null || true
                exit 124  # Same exit code as timeout command
            fi
        done
        wait "$pid"
    fi
else
    run_claude
fi

exit_code=$?

if [ $exit_code -eq 124 ]; then
    error "Claude iteration timed out"
elif [ $exit_code -ne 0 ]; then
    error "Claude iteration failed with exit code: $exit_code"
else
    log "Claude iteration completed successfully"
fi

exit $exit_code
