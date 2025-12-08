## Task ID Generation

Generate a task ID from the description by:

1. Convert to lowercase
2. Replace spaces and special characters with hyphens
3. Remove consecutive hyphens
4. Truncate to 50 characters max
5. Remove trailing hyphens

**Example transformations:**
- "Add dark mode to the TUI" → `add-dark-mode-to-the-tui`
- "Fix bug #123 in parser" → `fix-bug-123-in-parser`
- "Implement user auth (OAuth 2.0)" → `implement-user-auth-oauth-2-0`

**Handling duplicates:** If generating multiple task IDs and a duplicate is produced, append `-2`, `-3`, etc.
