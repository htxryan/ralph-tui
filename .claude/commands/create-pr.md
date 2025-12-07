---
description: Create a PR using github-operator agent, monitor CI, and fix any failures until builds pass
model: opus
---

# Create Pull Request

You are tasked with creating a pull request and ensuring all CI checks pass before completion. You will use the github-operator subagent for git and GitHub operations, and handle any CI failures by fixing the issues (NOT by disabling or removing tests).

## Critical Rules

1. **NEVER disable or remove tests** - If a test fails, you MUST fix the underlying issue
2. **NEVER skip CI checks** - All checks must pass before this command completes
3. **Use github-operator subagent** for all git/GitHub operations
4. **Monitor continuously** - Keep checking CI status until all checks are green
5. **Fix issues iteratively** - If CI fails, diagnose and fix, then push and re-check

## Initial Steps

### Step 1: Check Current State

First, gather information about the current state:

```bash
# Get current branch
git branch --show-current

# Check if there's an existing PR for this branch
gh pr view --json number,title,state,statusCheckRollup 2>/dev/null || echo "NO_EXISTING_PR"

# Check for uncommitted changes
git status --porcelain
```

### Step 2: Sync with Main Branch

Before creating or updating a PR, ensure the current branch is up to date with main:

1. **Fetch latest from remote:**
   ```bash
   git fetch origin main
   ```

2. **Check if main has new commits:**
   ```bash
   git log HEAD..origin/main --oneline
   ```

3. **If main has new commits, merge them in:**
   - Use the github-operator Task subagent to:
     - Merge origin/main into the current branch
     - Resolve any merge conflicts (ask user if complex conflicts arise)
     - Push the updated branch to remote

   Example prompt for github-operator:
   ```
   Merge origin/main into the current branch. If there are merge conflicts:
   1. For trivial conflicts (formatting, imports), resolve them automatically
   2. For complex logic conflicts, report them and ask for guidance

   After successful merge, push to remote with: git push origin HEAD
   ```

4. **If no new commits in main, just ensure branch is pushed:**
   ```bash
   git push origin HEAD
   ```

### Step 3: Branch Decision Point

Based on the initial check, proceed with one of:

**A. If NO existing PR:**
- Proceed to Step 4 (Create PR)

**B. If existing PR found:**
- Skip to Step 5 (Monitor CI)

## Step 4: Create Pull Request

Use the github-operator Task subagent to create the PR:

```
Create a pull request for the current branch with the following requirements:

1. Analyze all commits on this branch (compared to main) using:
   - git log main..HEAD --oneline
   - git diff main...HEAD

2. Create a well-structured PR with:
   - A clear, descriptive title summarizing the changes
   - A body using this format:

     ## Summary
     <1-3 bullet points describing the key changes>

     ## Changes
     <List of specific changes made>

     ## Test Plan
     <How to verify these changes work>

3. Create the PR using: gh pr create --title "..." --body "..."

4. Return the PR URL and number when complete.
```

## Step 5: Monitor CI Status

After the PR is created or if one already exists, monitor CI continuously:

### 5.1: Initial CI Check

Use the github-operator Task subagent to check CI status:

```
Check the CI status for the current PR:

1. Get the PR number for this branch:
   gh pr view --json number -q '.number'

2. Check the status of all checks:
   gh pr checks

3. Also get detailed status rollup:
   gh pr view --json statusCheckRollup

4. Report back:
   - List of all checks and their current status (pending/success/failure)
   - If any checks are still running, note which ones
   - If any checks failed, note which ones and any available error details
```

### 5.2: Wait for Pending Checks

If checks are still running:

1. Wait 30-60 seconds
2. Re-check status using github-operator
3. Repeat until all checks complete (success or failure)

### 5.3: Handle Failed Checks

If any CI checks fail:

1. **Diagnose the failure** using github-operator:
   ```
   Get detailed information about the CI failure:

   1. Run: gh pr checks --json name,state,link
   2. For each failed check, try to get logs:
      - gh run view <run-id> --log-failed (if available)
      - Or fetch the check URL and examine

   3. Report:
      - Which specific checks failed
      - The error messages or failure reasons
      - Any log output that indicates the cause
   ```

2. **Fix the issue** based on the failure type:

   **For test failures:**
   - Read the failing test file
   - Read the code being tested
   - Fix the underlying code issue (NOT the test)
   - If the test expectation is genuinely wrong due to intentional changes, update the test assertion to match new correct behavior
   - Run tests locally to verify: `pnpm test:run`

   **For build failures:**
   - Check TypeScript errors: `pnpm typecheck`
   - Check build output: `pnpm build`
   - Fix type errors, import issues, etc.

   **For lint failures:**
   - Run linter locally to identify issues
   - Fix the code style issues

3. **Commit and push the fix:**
   ```bash
   git add -A
   git commit -m "fix: resolve CI failures - [brief description]"
   git push origin HEAD
   ```

4. **Return to Step 5.1** to re-check CI status

## Step 6: Completion

When all CI checks pass:

1. **Verify final state:**
   ```bash
   gh pr checks
   gh pr view --json statusCheckRollup
   ```

2. **Report success:**
   ```
    All CI checks passed!

   PR URL: [url]
   PR Number: #[number]

   Checks passed:
   - [list of successful checks]

   The PR is ready for review.
   ```

## Error Handling

### Merge Conflicts During Main Sync
If merge conflicts occur when syncing with main:
1. For simple conflicts (formatting, imports), resolve automatically
2. For complex conflicts, pause and ask user for guidance:
   ```
   Merge conflict detected in the following files:
   - [file1]
   - [file2]

   The conflicts appear to be [simple/complex].
   [If simple]: I'll resolve these automatically.
   [If complex]: Please provide guidance on how to resolve.
   ```

### CI Failures That Can't Be Fixed
If you encounter a CI failure that seems impossible to fix:
1. Do NOT disable/skip the check
2. Do NOT remove the failing test
3. Report the issue clearly:
   ```
   Unable to automatically resolve CI failure:

   Check: [name]
   Error: [description]

   This appears to require manual intervention because: [reason]

   Suggested next steps:
   - [specific suggestion]
   ```

### Rate Limiting or API Errors
If GitHub API calls fail:
1. Wait 60 seconds
2. Retry the operation
3. If persistent, report and pause for user intervention

## Loop Structure

The overall flow should be:

```
1. Check current state
2. Sync with main (if needed)
3. Create PR (if doesn't exist)
4. LOOP:
   a. Check CI status
   b. If all passing ’ SUCCESS, exit
   c. If still pending ’ wait, continue loop
   d. If failures:
      - Diagnose
      - Fix
      - Commit & push
      - Continue loop
```

## Using github-operator Effectively

When spawning the github-operator Task subagent, always:

1. **Be specific about what you need:**
   - Clearly state the git/GitHub operation required
   - Specify what information to return

2. **Handle the response:**
   - Parse the returned information
   - Make decisions based on the results
   - Spawn follow-up tasks as needed

3. **Keep tasks focused:**
   - One major operation per task
   - Don't combine unrelated operations

Example task spawning:
```python
# For checking CI status
Task(
    subagent_type="github-operator",
    prompt="Check CI status for current PR. Return: list of checks with their status (pending/success/failure), and any error details for failures."
)

# For creating a PR
Task(
    subagent_type="github-operator",
    prompt="Create a PR from current branch to main. Analyze commits with 'git log main..HEAD' and 'git diff main...HEAD'. Return the PR URL and number."
)
```

## Important Reminders

- **Tests are sacred**: Never disable, remove, or skip tests. Always fix the underlying issue.
- **Be patient**: CI checks can take several minutes. Wait appropriately before re-checking.
- **Be thorough**: Read error logs carefully. The fix should address the root cause.
- **Keep pushing**: This command doesn't complete until ALL checks are green.
- **Sync with main first**: Always ensure you have the latest main changes before creating/updating PR.
