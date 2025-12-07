#!/bin/bash

# refine.sh - Run the full refinement workflow for a task
#
# Usage: ./refine.sh <task-id> <task-description>
#
# This script:
# 1. Creates the task file at .ai-docs/thoughts/plans/<task-id>/task.md
# 2. Runs /refine:research_codebase to research the codebase
# 3. Runs /refine:create_plan to create an implementation plan
# 4. Runs /refine:capture to capture to Vibe Kanban

set -e

# Get the repo root directory (where .git is located)
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Change to repo root to ensure consistent paths
cd "$REPO_ROOT"

# Check arguments
if [ $# -lt 2 ]; then
    echo "Error: Missing required arguments"
    echo ""
    echo "Usage: $0 <task-id> <task-description>"
    echo ""
    echo "Example: $0 my-feature \"Add dark mode support to the TUI\""
    exit 1
fi

TASK_ID="$1"
TASK_DESCRIPTION="$2"

# Define paths
PLANS_DIR=".ai-docs/thoughts/plans/${TASK_ID}"
TASK_FILE="${PLANS_DIR}/task.md"

echo "=== Refine Workflow: ${TASK_ID} ==="
echo ""

# Step 1: Create task directory and file
echo "Step 1: Creating task file..."
mkdir -p "${PLANS_DIR}"

cat > "${TASK_FILE}" << EOF
${TASK_DESCRIPTION}
EOF

echo "Created: ${TASK_FILE}"
echo ""

# Step 2: Run research_codebase
echo "Step 2: Running /refine:research_codebase ${TASK_ID}..."
echo ""
claude --print --permission-mode bypassPermissions --model opus "/refine:research_codebase ${TASK_ID}"
echo ""

# Step 3: Run create_plan
echo "Step 3: Running /refine:create_plan ${TASK_ID}..."
echo ""
claude --print --permission-mode bypassPermissions --model opus "/refine:create_plan ${TASK_ID}"
echo ""

# Step 4: Run capture
echo "Step 4: Running /refine:capture ${TASK_ID}..."
echo ""
claude --print --permission-mode bypassPermissions --model opus "/refine:capture ${TASK_ID}"
echo ""

echo "=== Refine workflow complete for: ${TASK_ID} ==="
