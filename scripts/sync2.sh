#!/usr/bin/env bash
#
# Sync2: Two-phase Claude orchestration
#
# Phase 1: Run orchestrate.md to determine workflow and task (with retry loop)
# Phase 2: Execute the selected workflow with the task
#
# This script implements a separation of concerns:
# - Orchestration decides WHAT to do (with validation and retry)
# - Workflow execution does the actual work
#

set -euo pipefail

# Export these so they're available in subshells
export SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# User's project directory (where .ralph/ lives) - can be set via environment
PROJECT_DIR="${RALPH_PROJECT_DIR:-$(pwd)}"
RALPH_DIR="$PROJECT_DIR/.ralph"

# File paths - user data in .ralph/, scripts from package
export ORCHESTRATE_PROMPT="$RALPH_DIR/orchestrate.md"
export ASSIGNMENT_FILE="$RALPH_DIR/planning/assignment.json"
export LOG_FILE="$RALPH_DIR/claude_output.jsonl"

# Optional timeout (in seconds). Set to 0 for no timeout.
# Default: 2 hours (7200 seconds)
CLAUDE_TIMEOUT=${RALPH_CLAUDE_TIMEOUT:-7200}

# Maximum orchestration attempts before hard failure
MAX_ORCHESTRATION_ATTEMPTS=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[sync2]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"
}

log_phase() {
    echo -e "${BLUE}[sync2]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"
}

log_attempt() {
    echo -e "${MAGENTA}[sync2]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"
}

warn() {
    echo -e "${YELLOW}[sync2]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"
}

error() {
    echo -e "${RED}[sync2]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

# Inject a synthetic user event into the JSONL log
# This captures the prompt text that would otherwise be lost (Claude's -p mode doesn't log input)
inject_user_event() {
    local prompt_text="$1"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

    # Escape the prompt text for JSON (handle newlines, quotes, backslashes)
    local escaped_text
    escaped_text=$(printf '%s' "$prompt_text" | jq -Rs '.')

    # Write synthetic user event to log file
    printf '{"type":"user","message":{"content":[{"type":"text","text":%s}]},"timestamp":"%s"}\n' \
        "$escaped_text" "$timestamp" >> "$LOG_FILE"
}

# Run Claude with a given prompt (piped via stdin)
# The prompt is also injected into the JSONL log as a synthetic user event
run_claude() {
    local timeout_seconds="$1"
    local prompt_text="$2"

    # Inject the prompt as a user event so the TUI can display it
    if [ -n "$prompt_text" ]; then
        inject_user_event "$prompt_text"
    fi

    local run_cmd='claude -p \
        --output-format=stream-json \
        --verbose \
        --dangerously-skip-permissions \
        --add-dir . | \
        tee -a "$LOG_FILE" | \
        uv run --no-project "$SCRIPT_DIR/visualize.py" --debug'

    if [ "$timeout_seconds" -gt 0 ]; then
        if command -v timeout &> /dev/null; then
            timeout --signal=TERM "$timeout_seconds" bash -c "$run_cmd"
        elif command -v gtimeout &> /dev/null; then
            gtimeout --signal=TERM "$timeout_seconds" bash -c "$run_cmd"
        else
            warn "No timeout command available, running without timeout"
            bash -c "$run_cmd"
        fi
    else
        bash -c "$run_cmd"
    fi
}

# Validate assignment.json schema
# Sets VALIDATION_ERROR with the error message if validation fails
# Returns 0 on success, 1 on failure
validate_assignment() {
    local file="$1"
    VALIDATION_ERROR=""

    # Check file exists
    if [ ! -f "$file" ]; then
        VALIDATION_ERROR="Assignment file not found: $file

The orchestration process must create this file with the following JSON structure:
{
  \"workflow\": \".ralph/workflows/[XX-workflow-name].md\",
  \"task_id\": \"<project-name>-<issue-id>\"
}

Please ensure the file is written to: $file"
        return 1
    fi

    # Check if it's valid JSON
    local jq_error
    if ! jq_error=$(jq empty "$file" 2>&1); then
        local file_content
        file_content=$(cat "$file" 2>/dev/null || echo "[could not read file]")
        VALIDATION_ERROR="Assignment file is not valid JSON.

JSON parsing error: $jq_error

File contents:
$file_content

Expected JSON structure:
{
  \"workflow\": \".ralph/workflows/[XX-workflow-name].md\",
  \"task_id\": \"<project-name>-<issue-id>\"
}"
        return 1
    fi

    # Check for required fields
    local workflow
    local task_id

    workflow=$(jq -r '.workflow // empty' "$file")
    task_id=$(jq -r '.task_id // empty' "$file")

    if [ -z "$workflow" ]; then
        local file_content
        file_content=$(cat "$file")
        VALIDATION_ERROR="Assignment file missing required field: 'workflow'

Current file contents:
$file_content

The 'workflow' field must contain the relative path to a workflow file, e.g.:
  \".ralph/workflows/01-feature-branch-incomplete.md\""
        return 1
    fi

    if [ -z "$task_id" ]; then
        local file_content
        file_content=$(cat "$file")
        VALIDATION_ERROR="Assignment file missing required field: 'task_id'

Current file contents:
$file_content

The 'task_id' field must contain a valid task ID, e.g.:
  \"background-assassins-abc\""
        return 1
    fi

    # Validate workflow file exists
    local workflow_path="$PROJECT_DIR/$workflow"
    if [ ! -f "$workflow_path" ]; then
        local available_workflows
        available_workflows=$(ls -1 "$PROJECT_DIR/.ralph/workflows/"*.md 2>/dev/null | sed "s|$PROJECT_DIR/||g" || echo "[no workflows found]")
        VALIDATION_ERROR="Workflow file not found: $workflow_path

The 'workflow' field value '$workflow' does not point to an existing file.

Available workflow files:
$available_workflows"
        return 1
    fi

    # Validate task_id format (either full ID with hyphen or short 3-char code)
    if [[ ! "$task_id" =~ -[a-zA-Z0-9]+$ && ! "$task_id" =~ ^[a-zA-Z0-9]{3}$ ]]; then
        VALIDATION_ERROR="Invalid task_id format: '$task_id'

The 'task_id' field must be a valid task ID."
        return 1
    fi

    log "Assignment validated successfully"
    log "  Workflow: $workflow"
    log "  Task ID: $task_id"

    return 0
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

cd "$PROJECT_DIR"

log "Starting two-phase orchestration"
log "Working directory: $PROJECT_DIR"
log "Max orchestration attempts: $MAX_ORCHESTRATION_ATTEMPTS"

# ----------------------------------------------------------------------------
# PHASE 0: Cleanup
# ----------------------------------------------------------------------------

log_phase "Phase 0: Cleanup"

# Ensure planning directory exists
mkdir -p "$RALPH_DIR/planning"

# Delete existing assignment file if present
if [ -f "$ASSIGNMENT_FILE" ]; then
    log "Removing existing assignment file: $ASSIGNMENT_FILE"
    rm -f "$ASSIGNMENT_FILE"
fi

# ----------------------------------------------------------------------------
# PHASE 1: Orchestration (with retry loop)
# ----------------------------------------------------------------------------

log_phase "Phase 1: Orchestration"

# Verify orchestrate prompt exists
if [ ! -f "$ORCHESTRATE_PROMPT" ]; then
    error "Orchestrate prompt not found: $ORCHESTRATE_PROMPT"
    exit 1
fi

# Calculate timeout per attempt
# Reserve half the total timeout for workflow execution
orchestration_total_timeout=$((CLAUDE_TIMEOUT / 2))
orchestrate_timeout=$((orchestration_total_timeout / MAX_ORCHESTRATION_ATTEMPTS))
if [ "$orchestrate_timeout" -lt 180 ]; then
    orchestrate_timeout=180  # Minimum 3 minutes per attempt
fi

log "Timeout per orchestration attempt: ${orchestrate_timeout}s"

# Orchestration retry loop
attempt=1
VALIDATION_ERROR=""
PREVIOUS_ERROR=""

while [ $attempt -le $MAX_ORCHESTRATION_ATTEMPTS ]; do
    log_attempt "Orchestration attempt $attempt of $MAX_ORCHESTRATION_ATTEMPTS"

    # Remove any existing assignment file before each attempt
    rm -f "$ASSIGNMENT_FILE"

    # Build the prompt
    if [ -n "$PREVIOUS_ERROR" ]; then
        # Include error feedback from previous attempt
        ORCHESTRATE_INPUT="# IMPORTANT: Previous Attempt Failed

Your previous orchestration attempt failed validation. Please fix the error and try again.

## Validation Error

\`\`\`
$PREVIOUS_ERROR
\`\`\`

## Instructions

Please re-read the orchestrate.md instructions below and ensure you:
1. Create the assignment file at the correct path: ./.ralph/planning/assignment.json
2. Use valid JSON syntax
3. Include both required fields: 'workflow' and 'task_id'
4. Use a valid workflow path that exists
5. Use a valid task ID

---

$(cat "$ORCHESTRATE_PROMPT")"
    else
        # First attempt - just use the prompt as-is
        ORCHESTRATE_INPUT=$(cat "$ORCHESTRATE_PROMPT")
    fi

    # Run orchestration
    echo "$ORCHESTRATE_INPUT" | run_claude "$orchestrate_timeout" "$ORCHESTRATE_INPUT"
    orchestrate_exit=$?

    if [ $orchestrate_exit -eq 124 ]; then
        warn "Orchestration attempt $attempt timed out"
        PREVIOUS_ERROR="Orchestration timed out after ${orchestrate_timeout} seconds.

Please ensure you complete the orchestration process within the time limit.
Focus on:
1. Quickly gathering the required context
2. Making the workflow selection decision
3. Identifying or creating the task
4. Writing the assignment.json file"
        attempt=$((attempt + 1))
        continue
    elif [ $orchestrate_exit -ne 0 ]; then
        warn "Orchestration attempt $attempt failed with exit code: $orchestrate_exit"
        PREVIOUS_ERROR="Claude exited with error code: $orchestrate_exit

This may indicate an internal error. Please try again and ensure:
1. All required tools are available
2. The assignment.json file is written before exiting"
        attempt=$((attempt + 1))
        continue
    fi

    # Validate the assignment file
    if validate_assignment "$ASSIGNMENT_FILE"; then
        log "Orchestration succeeded on attempt $attempt"
        break
    else
        warn "Validation failed on attempt $attempt"
        PREVIOUS_ERROR="$VALIDATION_ERROR"
        attempt=$((attempt + 1))
    fi
done

# Check if we exhausted all attempts
if [ $attempt -gt $MAX_ORCHESTRATION_ATTEMPTS ]; then
    error "============================================================"
    error "FATAL: Orchestration failed after $MAX_ORCHESTRATION_ATTEMPTS attempts"
    error "============================================================"
    error ""
    error "The orchestration process was unable to produce a valid"
    error "assignment.json file after $MAX_ORCHESTRATION_ATTEMPTS attempts."
    error ""
    error "Last validation error:"
    error "------------------------------------------------------------"
    echo "$PREVIOUS_ERROR" >&2
    error "------------------------------------------------------------"
    error ""
    error "Expected file location: $ASSIGNMENT_FILE"
    error ""
    error "Expected JSON structure:"
    error '  {'
    error '    "workflow": ".ralph/workflows/[XX-workflow-name].md",'
    error '    "task_id": "beads-XXXXXXXXX"'
    error '  }'
    error ""
    error "Please check:"
    error "  1. The orchestrate.md prompt is correctly formatted"
    error "  2. Claude has permission to write files"
    error "  3. The .ralph/planning/ directory exists and is writable"
    error "  4. Tasks can be created/listed"
    error ""
    error "============================================================"
    exit 1
fi

# Extract values from validated assignment
WORKFLOW=$(jq -r '.workflow' "$ASSIGNMENT_FILE")
TASK_ID=$(jq -r '.task_id' "$ASSIGNMENT_FILE")
WORKFLOW_PATH="$PROJECT_DIR/$WORKFLOW"

log "Assignment ready:"
log "  Workflow: $WORKFLOW"
log "  Task ID: $TASK_ID"

# ----------------------------------------------------------------------------
# PHASE 2: Workflow Execution
# ----------------------------------------------------------------------------

log_phase "Phase 2: Workflow Execution"

# Read the workflow file content
WORKFLOW_CONTENT=$(cat "$WORKFLOW_PATH")

# Build the prompt for workflow execution
WORKFLOW_PROMPT="Execute the workflow below for task #${TASK_ID}:

${WORKFLOW_CONTENT}"

log "Executing workflow: $WORKFLOW"
log "For task: $TASK_ID"

# Calculate remaining timeout for workflow execution
elapsed_orchestration=$((attempt * orchestrate_timeout))
workflow_timeout=$((CLAUDE_TIMEOUT - elapsed_orchestration))
if [ "$workflow_timeout" -lt 600 ]; then
    workflow_timeout=600  # Minimum 10 minutes for workflow execution
fi

log "Workflow execution timeout: ${workflow_timeout}s"

echo "$WORKFLOW_PROMPT" | run_claude "$workflow_timeout" "$WORKFLOW_PROMPT"
workflow_exit=$?

if [ $workflow_exit -eq 124 ]; then
    error "Workflow execution timed out"
    exit 124
elif [ $workflow_exit -ne 0 ]; then
    error "Workflow execution failed with exit code: $workflow_exit"
    exit $workflow_exit
fi

# ----------------------------------------------------------------------------
# COMPLETE
# ----------------------------------------------------------------------------

log_phase "Complete"
log "Two-phase orchestration completed successfully"
log "  Orchestration attempts: $attempt"
log "  Workflow executed: $WORKFLOW"
log "  Task: $TASK_ID"

exit 0
