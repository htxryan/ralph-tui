#!/usr/bin/env bash
#
# Mock Ralph Script - Generates sample JSONL output for testing the TUI
#
# This script simulates the real ralph.sh by generating realistic JSONL
# messages that would be produced by Claude Code during an autonomous session.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/claude_output.jsonl"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[mock-ralph]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"
}

# Generate timestamp in ISO format
timestamp() {
    date -u '+%Y-%m-%dT%H:%M:%S.%3NZ'
}

# Append a message to the JSONL file
append_jsonl() {
    echo "$1" >> "$LOG_FILE"
}

# Generate a system message
generate_system_message() {
    local subtype="$1"
    local text="$2"
    local msg=$(cat <<EOF
{
  "type": "system",
  "subtype": "$subtype",
  "message": {
    "content": [{
      "type": "text",
      "text": "$text"
    }]
  },
  "timestamp": "$(timestamp)"
}
EOF
)
    append_jsonl "$(echo "$msg" | jq -c .)"
    sleep 0.5
}

# Generate a user message
generate_user_message() {
    local text="$1"
    local msg=$(cat <<EOF
{
  "type": "user",
  "message": {
    "content": [{
      "type": "text",
      "text": "$text"
    }]
  },
  "timestamp": "$(timestamp)"
}
EOF
)
    append_jsonl "$(echo "$msg" | jq -c .)"
    sleep 0.5
}

# Generate an assistant message
generate_assistant_message() {
    local text="$1"
    local input_tokens="${2:-1234}"
    local output_tokens="${3:-567}"
    local msg=$(cat <<EOF
{
  "type": "assistant",
  "message": {
    "content": [{
      "type": "text",
      "text": "$text"
    }],
    "usage": {
      "input_tokens": $input_tokens,
      "output_tokens": $output_tokens
    }
  },
  "timestamp": "$(timestamp)"
}
EOF
)
    append_jsonl "$(echo "$msg" | jq -c .)"
    sleep 0.5
}

# Generate a tool use message
generate_tool_use() {
    local id="$1"
    local name="$2"
    local input="$3"
    local msg=$(cat <<EOF
{
  "type": "tool_use",
  "message": {
    "content": [{
      "type": "tool_use",
      "id": "$id",
      "name": "$name",
      "input": $input
    }]
  },
  "timestamp": "$(timestamp)"
}
EOF
)
    append_jsonl "$(echo "$msg" | jq -c .)"
    sleep 1
}

# Generate a tool result message
generate_tool_result() {
    local id="$1"
    local content="$2"
    local is_error="${3:-false}"
    local msg=$(cat <<EOF
{
  "type": "tool_result",
  "message": {
    "content": [{
      "type": "tool_result",
      "tool_use_id": "$id",
      "content": "$content",
      "is_error": $is_error
    }]
  },
  "timestamp": "$(timestamp)"
}
EOF
)
    append_jsonl "$(echo "$msg" | jq -c .)"
    sleep 0.5
}

# Generate a Task subagent call with full conversation
generate_task_subagent() {
    local id="$1"
    local subagent_type="$2"
    local description="$3"
    local prompt="$4"
    
    # Tool use for Task
    local input=$(cat <<EOF
{
  "subagent_type": "$subagent_type",
  "description": "$description",
  "prompt": "$prompt"
}
EOF
)
    generate_tool_use "$id" "Task" "$input"
    
    # Simulate subagent conversation in result
    local result="Working on: $description

I'll help you with $prompt. Let me start by exploring the codebase.

Using Glob tool to find relevant files...
Found 15 files matching the pattern.

Using Read tool to examine the main implementation...
The file contains 245 lines of TypeScript code.

Based on my analysis:
1. The current implementation uses React hooks
2. State management is handled via Context API
3. There are opportunities for optimization

Implementing the requested changes now...

Using Edit tool to update the component...
Successfully updated the file.

Task completed successfully. The $description has been implemented."
    generate_tool_result "$id" "$result" "false"
}

# Generate TodoWrite tool calls
generate_todo_update() {
    local id="$1"
    local todos='[
        {"id": "1", "content": "Read project documentation", "status": "completed"},
        {"id": "2", "content": "Review existing code implementation", "status": "completed"},
        {"id": "3", "content": "Implement authentication flow", "status": "in_progress"},
        {"id": "4", "content": "Write integration tests", "status": "pending"},
        {"id": "5", "content": "Deploy to staging", "status": "pending"}
    ]'
    
    local input=$(cat <<EOF
{
  "todos": $todos
}
EOF
)
    generate_tool_use "$id" "TodoWrite" "$input"
    generate_tool_result "$id" "Todos have been modified successfully. Ensure that you continue to use the todo list to track your progress." "false"
}

# Generate a task read
generate_bd_read() {
    local id="$1"
    local bd_output=$(cat <<EOF
Issue background-assassins-nf7:
Title: Develop Ralph TUI monitoring interface
Type: Feature
Status: In Progress
Priority: Medium

Description:
The Ink-based TUI application is mostly implemented with all major components.
We need to create a mock ralph.sh script and test the TUI thoroughly.

Dependencies: None
Assignee: claude
Created: 2025-11-30
EOF
)
    
    local input='{"issueId": "background-assassins-nf7"}'
    generate_tool_use "$id" "BDRead" "$input"
    generate_tool_result "$id" "$bd_output" "false"
}

# Main simulation
main() {
    log "Starting mock Ralph session..."
    log "Writing to: $LOG_FILE"
    
    # Clear or create the log file
    > "$LOG_FILE"
    
    log "Generating sample JSONL events..."
    
    # Session start
    generate_system_message "session_start" "Claude Code session started. Session ID: mock-session-001"
    generate_system_message "environment" "Working directory: /Users/ryan.henderson/src/background-assassins2"
    
    # Initial user request
    generate_user_message "Continue working on the Ralph TUI monitoring interface. Make sure it's fully functional and tested."
    
    # Assistant response with various tool calls
    generate_assistant_message "I'll help you continue working on the Ralph TUI monitoring interface. Let me first check the current status and then complete the implementation." 1500 750
    
    # Read task
    generate_bd_read "tool-001"
    
    # Update todos
    generate_todo_update "tool-002"
    
    # Read some files
    generate_tool_use "tool-003" "Read" '{"file_path": "/Users/ryan.henderson/src/background-assassins2/.ralph/tui/src/app.tsx"}'
    generate_tool_result "tool-003" "File contents: [200 lines of React component code]" "false"
    
    generate_tool_use "tool-004" "Glob" '{"pattern": "**/*.tsx", "path": ".ralph/tui"}'
    generate_tool_result "tool-004" "Found 25 matching files:\n- src/app.tsx\n- src/cli.tsx\n- src/components/header.tsx\n- ..." "false"
    
    # Task subagent for exploration
    generate_task_subagent "tool-005" "explore" "Explore TUI implementation" "Analyze the current TUI implementation and identify what needs to be completed"
    
    generate_assistant_message "Based on my analysis, the TUI is well-implemented. Now I'll create the mock script for testing." 2000 900
    
    # Create mock script
    generate_tool_use "tool-006" "Write" '{"file_path": "/Users/ryan.henderson/src/background-assassins2/.ralph/test-mock.sh", "content": "#!/bin/bash\\necho '\''Mock script created'\''"}'
    generate_tool_result "tool-006" "File written successfully" "false"
    
    # Run tests
    generate_tool_use "tool-007" "Bash" '{"command": "cd .ralph/tui && pnpm test:run"}'
    generate_tool_result "tool-007" "✓ src/test/parser.test.ts (5 tests)\n\nTest Files  1 passed (1)\nTests  5 passed (5)" "false"
    
    # Task subagent for implementation
    generate_task_subagent "tool-008" "implement" "Complete TUI implementation" "Add the remaining features and ensure everything works correctly"
    
    # More todos updates
    generate_todo_update "tool-009"
    
    generate_assistant_message "The Ralph TUI monitoring interface is now complete. The mock script has been created and all tests are passing." 1800 650
    
    # Some errors for testing error display
    generate_tool_use "tool-010" "Bash" '{"command": "this-command-does-not-exist"}'
    generate_tool_result "tool-010" "bash: this-command-does-not-exist: command not found" "true"
    
    generate_assistant_message "Let me fix that error and try again with the correct command." 500 200
    
    generate_tool_use "tool-011" "Bash" '{"command": "echo \"Test completed successfully\""}'
    generate_tool_result "tool-011" "Test completed successfully" "false"
    
    # Final message
    generate_assistant_message "The Ralph TUI implementation is now complete and tested. You can run it using 'pnpm run' in the .ralph/tui directory." 1200 450
    
    generate_system_message "session_end" "Session completed successfully"
    
    log "Sample JSONL generation complete!"
    log "Generated $(wc -l < "$LOG_FILE") events"
    log ""
    log "You can now test the TUI by running:"
    echo -e "  ${BLUE}cd .ralph/tui && pnpm run${NC}"
    log ""
    log "The TUI will read from: $LOG_FILE"
}

# Check for jq dependency
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Please install it first."
    echo "  macOS: brew install jq"
    echo "  Ubuntu: sudo apt-get install jq"
    exit 1
fi

main "$@"