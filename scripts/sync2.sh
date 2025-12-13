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

# Active project - can be set via environment or defaults to "default"
RALPH_PROJECT="${RALPH_PROJECT:-default}"
RALPH_PROJECT_DIR_PATH="$RALPH_DIR/projects/$RALPH_PROJECT"

# File paths - user data in .ralph/, scripts from package
# Orchestrate prompt is now bundled with the package (not copied to .ralph/)
export ORCHESTRATE_PROMPT="$SCRIPT_DIR/../prompts/orchestrate.md"
export ORCHESTRATE_SETTINGS="$RALPH_DIR/settings.json"
export PROCESS_PROMPT_SCRIPT="$SCRIPT_DIR/process-prompt.js"

# Log file path - one timestamped file per sync2 execution in the project's claude_output folder
# Format: <timestamp>.jsonl where timestamp is YYYYMMDDHHmmss (sortable by filename)
# All phases (orchestrate + execute) within a single sync2.sh run share this file
generate_log_file_path() {
    local timestamp
    timestamp=$(date -u "+%Y%m%d%H%M%S")
    echo "$RALPH_PROJECT_DIR_PATH/claude_output/${timestamp}.jsonl"
}

# Generate the session log file at script start
# Can be overridden via RALPH_LOG_FILE env var (e.g., from TUI)
export LOG_FILE="${RALPH_LOG_FILE:-$(generate_log_file_path)}"

# Project-specific paths
export EXECUTE_PATH="$RALPH_PROJECT_DIR_PATH/execute.md"
export PROJECT_SETTINGS="$RALPH_PROJECT_DIR_PATH/settings.json"
# Assignment file is now per-project (moved from .ralph/assignment.json)
export ASSIGNMENT_FILE="$RALPH_PROJECT_DIR_PATH/assignment.json"

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

# Process the orchestrate.md template by injecting provider-specific instructions
# and substituting template variables like {{execute_path}}
# Reads settings.json to determine provider, then injects the appropriate instructions
process_orchestrate_prompt() {
    if [ -f "$PROCESS_PROMPT_SCRIPT" ]; then
        # Pass orchestrate prompt, settings, and project info to the processor
        node "$PROCESS_PROMPT_SCRIPT" "$ORCHESTRATE_PROMPT" "$ORCHESTRATE_SETTINGS" "$RALPH_PROJECT" "$PROJECT_SETTINGS"
    else
        # Fallback to raw template if processor not available
        cat "$ORCHESTRATE_PROMPT"
    fi
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
# Uses the session's LOG_FILE (set at script start)
# The prompt is also injected into the JSONL log as a synthetic user event
run_claude() {
    local timeout_seconds="$1"
    local prompt_text="$2"

    # Inject the prompt as a user event so the TUI can display it
    if [ -n "$prompt_text" ]; then
        inject_user_event "$prompt_text"
    fi

    # Build disallowed-tools argument to restrict Read tool on non-active project directories
    local disallow_args=""
    if [ -d "$RALPH_DIR/projects" ]; then
        for project_dir in "$RALPH_DIR/projects"/*; do
            if [ -d "$project_dir" ]; then
                local project_name=$(basename "$project_dir")
                # Skip the current active project
                if [ "$project_name" != "$RALPH_PROJECT" ]; then
                    # Disallow Read tool on this project directory
                    disallow_args="$disallow_args --disallowedTools \"Read($project_dir/*)\""
                fi
            fi
        done
    fi

    local run_cmd="claude -p \
        --output-format=stream-json \
        --verbose \
        --dangerously-skip-permissions \
        --add-dir . \
        $disallow_args | \
        tee -a \"\$LOG_FILE\" | \
        uv run --no-project \"\$SCRIPT_DIR/visualize.py\" --debug"

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

# Check if assignment.json exists (used to detect "no work available" vs validation failure)
# Returns 0 if file exists, 1 if not
assignment_exists() {
    [ -f "$1" ]
}

# Validate assignment.json schema (new format with next_step)
# Sets VALIDATION_ERROR with the error message if validation fails
# Returns 0 on success, 1 on failure
# NOTE: Only call this AFTER confirming the file exists with assignment_exists()
validate_assignment() {
    local file="$1"
    VALIDATION_ERROR=""

    # Check file exists (should already be confirmed, but double-check)
    if [ ! -f "$file" ]; then
        VALIDATION_ERROR="Assignment file not found: $file

The orchestration process must create this file with the following JSON structure:
{
  \"task_id\": \"<task-identifier>\",
  \"next_step\": \"<description of next step>\",
  \"pull_request_url\": null
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
  \"task_id\": \"<task-identifier>\",
  \"next_step\": \"<description of next step>\",
  \"pull_request_url\": null
}"
        return 1
    fi

    # Check for required fields (new schema)
    local task_id
    local next_step

    task_id=$(jq -r '.task_id // empty' "$file")
    next_step=$(jq -r '.next_step // empty' "$file")

    if [ -z "$task_id" ]; then
        local file_content
        file_content=$(cat "$file")
        VALIDATION_ERROR="Assignment file missing required field: 'task_id'

Current file contents:
$file_content

The 'task_id' field must contain a valid task identifier."
        return 1
    fi

    if [ -z "$next_step" ]; then
        local file_content
        file_content=$(cat "$file")
        VALIDATION_ERROR="Assignment file missing required field: 'next_step'

Current file contents:
$file_content

The 'next_step' field must describe the next action to take in the workflow."
        return 1
    fi

    log "Assignment validated successfully"
    log "  Task ID: $task_id"
    log "  Next Step: $next_step"

    return 0
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

cd "$PROJECT_DIR"

# Ensure project directory and claude_output subfolder exist for log file
mkdir -p "$RALPH_PROJECT_DIR_PATH/claude_output"

log "Starting two-phase orchestration"
log "Working directory: $PROJECT_DIR"
log "Active project: $RALPH_PROJECT"
log "Log file: $LOG_FILE"
log "Max orchestration attempts: $MAX_ORCHESTRATION_ATTEMPTS"

# ----------------------------------------------------------------------------
# PHASE 0: Cleanup
# ----------------------------------------------------------------------------

log_phase "Phase 0: Cleanup"
log "Active project: $RALPH_PROJECT"

# Ensure .ralph directory exists
mkdir -p "$RALPH_DIR"

# Delete existing assignment file if present
if [ -f "$ASSIGNMENT_FILE" ]; then
    log "Removing existing assignment file: $ASSIGNMENT_FILE"
    rm -f "$ASSIGNMENT_FILE"
fi

# Verify execute.md exists for the active project
if [ ! -f "$EXECUTE_PATH" ]; then
    error "Execute file not found for project '$RALPH_PROJECT': $EXECUTE_PATH"
    error "Please run 'ralph init' or create .ralph/projects/$RALPH_PROJECT/execute.md"
    exit 1
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
NO_WORK_AVAILABLE=false

while [ $attempt -le $MAX_ORCHESTRATION_ATTEMPTS ]; do
    log_attempt "Orchestration attempt $attempt of $MAX_ORCHESTRATION_ATTEMPTS"

    # Remove any existing assignment file before each attempt
    rm -f "$ASSIGNMENT_FILE"

    # Build the prompt (process template to inject provider-specific instructions)
    processed_prompt=$(process_orchestrate_prompt)

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
1. Create the assignment file at the correct project-specific path
2. Use valid JSON syntax
3. Include required fields: 'task_id', 'next_step', 'pull_request_url'
4. Use a valid task ID from the task management system
5. Specify the next execution step clearly

---

$processed_prompt"
    else
        # First attempt - just use the processed prompt
        ORCHESTRATE_INPUT="$processed_prompt"
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

    # Claude exited successfully (exit code 0)
    # Check if assignment.json exists - absence means "no work available"
    if ! assignment_exists "$ASSIGNMENT_FILE"; then
        # No assignment file = no work available (intentional, not an error)
        log "Orchestration completed: No work available"
        log "  No tasks found in the source status."
        log "  The harness will retry orchestration after a delay."
        NO_WORK_AVAILABLE=true
        break
    fi

    # Assignment file exists - validate its contents
    if validate_assignment "$ASSIGNMENT_FILE"; then
        log "Orchestration succeeded on attempt $attempt"
        break
    else
        warn "Validation failed on attempt $attempt"
        PREVIOUS_ERROR="$VALIDATION_ERROR"
        attempt=$((attempt + 1))
    fi
done

# ----------------------------------------------------------------------------
# Handle: No Work Available
# ----------------------------------------------------------------------------
# If orchestration determined no work is available, exit cleanly.
# The main loop (ralph.sh) will sleep and retry orchestration later.

if [ "$NO_WORK_AVAILABLE" = true ]; then
    log_phase "No Work Available"
    log "No tasks are currently available in the source status."
    log "Exiting cleanly. The harness will retry after the configured delay."
    exit 0
fi

# ----------------------------------------------------------------------------
# Handle: Orchestration Exhausted All Attempts
# ----------------------------------------------------------------------------

# Check if we exhausted all attempts without success
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
    error '    "task_id": "<task-identifier>",'
    error '    "next_step": "<description of next step>",'
    error '    "pull_request_url": null'
    error '  }'
    error ""
    error "Please check:"
    error "  1. The orchestrate.md prompt is correctly formatted"
    error "  2. Claude has permission to write files"
    error "  3. The .ralph/ directory exists and is writable"
    error "  4. Tasks can be created/listed"
    error ""
    error "============================================================"
    exit 1
fi

# Extract values from validated assignment
TASK_ID=$(jq -r '.task_id' "$ASSIGNMENT_FILE")
NEXT_STEP=$(jq -r '.next_step' "$ASSIGNMENT_FILE")

log "Assignment ready:"
log "  Task ID: $TASK_ID"
log "  Next Step: $NEXT_STEP"

# ----------------------------------------------------------------------------
# PHASE 2: Workflow Execution
# ----------------------------------------------------------------------------

log_phase "Phase 2: Workflow Execution"
log "Project: $RALPH_PROJECT"

# Read the execute.md file content
EXECUTE_CONTENT=$(cat "$EXECUTE_PATH")

# Build the prompt for workflow execution
WORKFLOW_PROMPT="Execute the workflow below for task #${TASK_ID}.

## Starting Point

${NEXT_STEP}

## Execution Workflow

${EXECUTE_CONTENT}"

log "Executing workflow: $EXECUTE_PATH"
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
log "  Project: $RALPH_PROJECT"
log "  Task: $TASK_ID"

exit 0
