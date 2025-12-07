#!/bin/bash

# refine-many.sh - Run the full refinement workflow for multiple tasks in parallel
#
# Usage: ./refine-many.sh <tasks-file>
#
# The tasks file should contain one task per line in the format:
#   task-id|Task description here
#
# Example tasks file:
#   add-dark-mode|Add dark mode support to the TUI
#   fix-parser-bug|Fix memory leak in JSONL parser
#
# This script:
# 1. Creates a temporary results directory
# 2. Runs up to 5 concurrent refine.sh processes
# 3. Reports success/failure for each task
# 4. Outputs a summary at the end

set -e

# Get the repo root directory
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Check arguments
if [ $# -lt 1 ]; then
    echo "Error: Missing required argument"
    echo ""
    echo "Usage: $0 <tasks-file>"
    echo ""
    echo "Tasks file format (one per line):"
    echo "  task-id|Task description here"
    echo ""
    echo "Example:"
    echo "  add-dark-mode|Add dark mode support to the TUI"
    echo "  fix-parser-bug|Fix memory leak in JSONL parser"
    exit 1
fi

TASKS_FILE="$1"

if [ ! -f "$TASKS_FILE" ]; then
    echo "Error: Tasks file not found: $TASKS_FILE"
    exit 1
fi

# Create temp directory for results
RESULTS_DIR=$(mktemp -d)
MAX_JOBS=5

cd "$REPO_ROOT"

# Function to run a single refinement task
run_task() {
    local task_id="$1"
    local description="$2"
    local result_file="${RESULTS_DIR}/${task_id}.result"
    local log_file="${RESULTS_DIR}/${task_id}.log"

    echo "[$(date '+%H:%M:%S')] Starting: ${task_id}"

    # Run refine.sh and capture output
    if "${REPO_ROOT}/.claude/tools/refine.sh" "${task_id}" "${description}" > "${log_file}" 2>&1; then
        echo "SUCCESS" > "${result_file}"
        echo "[$(date '+%H:%M:%S')] Completed: ${task_id} [SUCCESS]"
    else
        echo "FAILED" > "${result_file}"
        # Capture last 20 lines of error
        tail -20 "${log_file}" >> "${result_file}"
        echo "[$(date '+%H:%M:%S')] Completed: ${task_id} [FAILED]"
    fi
}

echo "=== Starting parallel refinement workflow ==="
echo "Max concurrent jobs: ${MAX_JOBS}"
echo "Total tasks: $(wc -l < "$TASKS_FILE" | tr -d ' ')"
echo "Results directory: ${RESULTS_DIR}"
echo ""

# Array to hold background PIDs
declare -a pids=()
declare -a task_ids=()

# Read tasks and start jobs with concurrency control
while IFS='|' read -r task_id description; do
    # Skip empty lines
    [ -z "$task_id" ] && continue

    # Wait if we're at max capacity
    while [ ${#pids[@]} -ge $MAX_JOBS ]; do
        # Check each PID and remove finished ones
        new_pids=()
        new_task_ids=()
        for i in "${!pids[@]}"; do
            if kill -0 "${pids[$i]}" 2>/dev/null; then
                new_pids+=("${pids[$i]}")
                new_task_ids+=("${task_ids[$i]}")
            fi
        done
        pids=("${new_pids[@]}")
        task_ids=("${new_task_ids[@]}")

        if [ ${#pids[@]} -ge $MAX_JOBS ]; then
            sleep 2
        fi
    done

    # Start new job in background
    run_task "$task_id" "$description" &
    pids+=($!)
    task_ids+=("$task_id")

done < "$TASKS_FILE"

# Wait for all remaining jobs
echo ""
echo "Waiting for remaining jobs to complete..."
wait

echo ""
echo "=== All tasks completed ==="
echo ""

# Generate summary
success_count=0
failed_count=0
declare -a failed_tasks=()

for result_file in "${RESULTS_DIR}"/*.result; do
    [ -f "$result_file" ] || continue
    task_id=$(basename "$result_file" .result)
    status=$(head -1 "$result_file")
    if [ "$status" = "SUCCESS" ]; then
        ((success_count++)) || true
    else
        ((failed_count++)) || true
        failed_tasks+=("$task_id")
    fi
done

total=$((success_count + failed_count))

echo "=== Summary ==="
echo "Total: $total | Success: $success_count | Failed: $failed_count"
echo ""

if [ ${#failed_tasks[@]} -gt 0 ]; then
    echo "Failed tasks:"
    for task_id in "${failed_tasks[@]}"; do
        echo "  - $task_id"
        echo "    Error (last 5 lines):"
        tail -5 "${RESULTS_DIR}/${task_id}.result" | sed 's/^/      /'
    done
fi

echo ""
echo "Results directory: ${RESULTS_DIR}"
echo "Log files: ${RESULTS_DIR}/<task-id>.log"
