#!/usr/bin/env bash
#
# Ralph Wiggum Method: Safe Autonomous Loop
#
# Safety features:
# - Lock file prevents concurrent runs (waits for previous to finish)
# - Log rotation prevents unbounded file growth
# - Optional Chrome cleanup between runs
# - Graceful shutdown on SIGINT/SIGTERM
#

set -euo pipefail

# Directory where this script lives (for finding other scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# User's project directory (where .ralph/ lives) - can be set via environment
PROJECT_DIR="${RALPH_PROJECT_DIR:-$(pwd)}"
RALPH_DIR="$PROJECT_DIR/.ralph"

# User data paths (in user's project .ralph/)
LOCKFILE="$RALPH_DIR/claude.lock"
LOG_FILE="$RALPH_DIR/claude_output.jsonl"
MAX_LOG_SIZE_MB=50  # Rotate when log exceeds this size
MAX_LOG_AGE_DAYS=7  # Delete rotated logs older than this

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[ralph]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"
}

warn() {
    echo -e "${YELLOW}[ralph]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"
}

error() {
    echo -e "${RED}[ralph]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

cleanup() {
    log "Shutting down..."
    rm -f "$LOCKFILE"
    exit 0
}

trap cleanup SIGINT SIGTERM

is_process_running() {
    local pid=$1
    kill -0 "$pid" 2>/dev/null
}

acquire_lock() {
    if [ -f "$LOCKFILE" ]; then
        local pid
        pid=$(cat "$LOCKFILE" 2>/dev/null || echo "")

        if [ -n "$pid" ] && is_process_running "$pid"; then
            return 1  # Lock held by running process
        else
            warn "Removing stale lock file (PID $pid no longer running)"
            rm -f "$LOCKFILE"
        fi
    fi

    echo $$ > "$LOCKFILE"
    return 0
}

release_lock() {
    rm -f "$LOCKFILE"
}

rotate_logs_if_needed() {
    if [ ! -f "$LOG_FILE" ]; then
        return
    fi

    local archive_dir="$RALPH_DIR/archive"
    local size_bytes
    # macOS uses -f%z, Linux uses -c%s
    size_bytes=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo "0")
    local max_bytes=$((MAX_LOG_SIZE_MB * 1024 * 1024))

    if [ "$size_bytes" -gt "$max_bytes" ]; then
        mkdir -p "$archive_dir"

        # Get timestamp from last line of file
        local last_line last_ts filename_ts
        last_line=$(tail -1 "$LOG_FILE" 2>/dev/null)
        last_ts=$(echo "$last_line" | jq -r '.timestamp // empty' 2>/dev/null)

        if [[ -n "$last_ts" ]]; then
            # Convert ISO to filename format: 2025-11-30T18:45:32.456Z -> 20251130_184532_456
            # Extract date/time parts using parameter expansion
            local dt_part="${last_ts%%.*}"  # Remove .456Z
            dt_part="${dt_part//[-T:]/}"    # Remove - T : -> 20251130184532
            local date_part="${dt_part:0:8}"
            local time_part="${dt_part:8:6}"
            # Extract milliseconds
            local millis="${last_ts#*.}"
            millis="${millis%Z}"
            millis="${millis:0:3}"
            filename_ts="${date_part}_${time_part}_${millis:-000}"
        else
            filename_ts=$(date -u "+%Y%m%d_%H%M%S_000")
        fi

        local rotated_file="$archive_dir/claude_output.${filename_ts}.jsonl"

        # Handle collision
        local counter=1
        while [[ -f "$rotated_file" ]] || [[ -f "${rotated_file}.gz" ]]; do
            rotated_file="$archive_dir/claude_output.${filename_ts}_${counter}.jsonl"
            counter=$((counter + 1))
        done

        log "Rotating log file (${size_bytes} bytes > ${max_bytes} bytes)"
        mv "$LOG_FILE" "$rotated_file"

        # Compress rotated log in background
        if command -v gzip &> /dev/null; then
            gzip "$rotated_file" &
        fi
    fi
}

cleanup_old_logs() {
    local archive_dir="$RALPH_DIR/archive"

    if [[ ! -d "$archive_dir" ]]; then
        return
    fi

    find "$archive_dir" -name "claude_output.*.jsonl*" -mtime +"$MAX_LOG_AGE_DAYS" -delete 2>/dev/null || true
}

cleanup_chrome_tabs() {
    log "Cleaning up Chrome localhost tabs..."

    # Close tabs with localhost URLs (dev server tabs opened by Claude)
    osascript -e '
        tell application "Google Chrome"
            set windowList to every window
            repeat with aWindow in windowList
                set tabList to every tab of aWindow
                repeat with aTab in tabList
                    set tabURL to URL of aTab
                    if tabURL contains "localhost" then
                        close aTab
                    end if
                end repeat
            end repeat
        end tell
    ' 2>/dev/null || true  # Silently ignore if Chrome not running
}

cleanup_test_processes() {
    log "Cleaning up orphaned test processes..."

    local killed=0

    # Kill vitest processes (these can use 1-2GB each)
    while IFS= read -r pid; do
        if [ -n "$pid" ]; then
            kill -TERM "$pid" 2>/dev/null && killed=$((killed + 1))
        fi
    done < <(pgrep -f "vitest" 2>/dev/null || true)

    # Kill playwright processes
    while IFS= read -r pid; do
        if [ -n "$pid" ]; then
            kill -TERM "$pid" 2>/dev/null && killed=$((killed + 1))
        fi
    done < <(pgrep -f "playwright" 2>/dev/null || true)

    # Kill any orphaned Next.js dev servers (port 3000)
    while IFS= read -r pid; do
        if [ -n "$pid" ]; then
            kill -TERM "$pid" 2>/dev/null && killed=$((killed + 1))
        fi
    done < <(lsof -ti:3000 2>/dev/null || true)

    # Kill orphaned node processes running from this project's node_modules
    # Be careful to only kill processes from THIS project
    while IFS= read -r line; do
        local pid
        pid=$(echo "$line" | awk '{print $1}')
        if [ -n "$pid" ]; then
            kill -TERM "$pid" 2>/dev/null && killed=$((killed + 1))
        fi
    done < <(ps -eo pid,command | grep -E "node.*(vitest|jest|test)" | grep "$PROJECT_DIR" | grep -v grep 2>/dev/null || true)

    if [ "$killed" -gt 0 ]; then
        log "Killed $killed orphaned test process(es)"
        sleep 2  # Give processes time to clean up
    fi
}

run_iteration() {
    local iteration=$1

    log "Starting iteration #${iteration}"

    # Rotate logs if needed and cleanup old archives
    rotate_logs_if_needed
    cleanup_old_logs

    # Cleanup from previous run
    cleanup_chrome_tabs
    cleanup_test_processes

    # Run the sync script
    "$SCRIPT_DIR/sync2.sh"
    local exit_code=$?

    if [ $exit_code -ne 0 ]; then
        warn "Iteration #${iteration} exited with code ${exit_code}"
    else
        log "Iteration #${iteration} completed successfully"
    fi

    return $exit_code
}

main() {
    log "Ralph Wiggum Method starting..."
    log "Project dir: $PROJECT_DIR"
    log "Lock file: $LOCKFILE"
    log "Log file: $LOG_FILE"
    log "Max log size: ${MAX_LOG_SIZE_MB}MB"

    local iteration=0
    local consecutive_failures=0
    local max_consecutive_failures=3

    while true; do
        iteration=$((iteration + 1))

        if acquire_lock; then
            if run_iteration "$iteration"; then
                consecutive_failures=0
            else
                consecutive_failures=$((consecutive_failures + 1))
                if [ $consecutive_failures -ge $max_consecutive_failures ]; then
                    error "Too many consecutive failures ($consecutive_failures), pausing for 60 seconds..."
                    sleep 60
                    consecutive_failures=0
                fi
            fi
            release_lock
        else
            local holder_pid
            holder_pid=$(cat "$LOCKFILE" 2>/dev/null || echo "unknown")
            warn "Previous iteration (PID $holder_pid) still running, waiting..."
        fi

        echo -e "\n===SLEEP===\n===SLEEP===\n"
        log "Sleeping 10 seconds before next iteration..."
        sleep 10
    done
}

main "$@"
