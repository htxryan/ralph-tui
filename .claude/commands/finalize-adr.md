---
description: Finalize an ADR by removing alternative options and updating status to Accepted
---

You are helping to finalize an Architecture Decision Record (ADR) after a decision has been made.

## Your Task

An ADR has been created using the `/create-adr` command and contains multiple options under consideration. Now that a decision has been made, you need to clean up the document to:

1. **Lock in the decision** by updating the status
2. **Remove alternative options** to prevent future confusion
3. **Streamline the content** to focus only on the chosen solution

## Steps to Follow

### 1. Identify the ADR to Finalize

- If the user provides an ADR number or filename, use that
- Otherwise, ask: "Which ADR would you like to finalize?" and list available ADRs from `.ai-docs/adr/`

### 2. Determine Which Option Was Selected

- Check if the user provided the decision/selected option when invoking the command
- If NOT provided, ask: "Which option did you select?" and list the available options from the "Options Considered" section
- Record which option number or name was chosen (e.g., "Option 2", "JWT Tokens", etc.)

### 3. Read the Current ADR

- Read the entire ADR file to understand its structure
- Identify the "Options Considered" section and all option subsections
- Locate the content for the selected option that will be used in the simplified Decision section

### 4. Update the Status

Change the status from `Proposed` to `Accepted`:

```markdown
## Status
Accepted
```

### 5. Remove the "Options Considered" Section

Delete the entire "Options Considered" section and all its subsections (Option 1, Option 2, etc.).

**What to Remove:**
- The `## Options Considered` heading
- All option subsections (e.g., `### Option 1: Name`, `### Option 2: Name`, etc.)
- All content within those sections (Approach, Pros, Cons, Security, Complexity)
- Any separator lines (`---`) between options

### 6. Simplify the "Decision" Section

Transform the Decision section to focus only on the selected solution.

**Before (typical structure):**
```markdown
## Decision

**Selected Option: Option X - Name**

### Rationale

JWT tokens strike the ideal balance...

The inability to revoke tokens before expiration is acceptable because:
- [reasons comparing to other options]
- [mentions of what other options couldn't do]
```

**After (simplified structure):**
```markdown
## Decision

We will use **[Solution Name]** for [purpose].

### Approach

- [How it works - bullet points]
- [Key technical details]
- [Core mechanism]

### Key Benefits

1. **[Benefit 1]**: [Explanation]
2. **[Benefit 2]**: [Explanation]
3. **[Benefit 3]**: [Explanation]
...

### Trade-offs

**Limitation**: [Main limitation or drawback]

**Why This Is Acceptable**:
- [Reason 1 in context of our use case]
- [Reason 2]
- [Reason 3]
```

**Guidelines for Simplification:**
- Remove references to "Option X" or "other options"
- Remove comparative language (e.g., "better than", "unlike other approaches")
- State the solution directly and positively
- Keep the technical approach description
- Keep the benefits/rationale
- Keep trade-off acknowledgment and justification
- Remove any language suggesting this was chosen over alternatives

### 7. Keep All Other Sections Unchanged

**DO NOT modify these sections:**
- Context
- Decision Drivers
- Implementation Details (all subsections)
- Consequences
- Future Enhancements
- References

These sections should remain exactly as they are.

### 8. Clean Up Any References to Rejected Options

Scan the remaining document for any lingering references to "Option X" or alternative approaches:
- In code comments
- In consequence descriptions
- In future enhancements (e.g., "Use short-lived access token + refresh token pattern (Option 5)" → "Use short-lived access token + refresh token pattern")

Remove or rephrase these references to eliminate confusion.

### 9. Update CLAUDE.md

Add or update the ADR summary in `CLAUDE.md` under the "#### Architecture Decision Records" section:

1. Write a **one-sentence summary** that captures the key decision point
2. Add it to the bulleted list in CLAUDE.md

**Format:**
```markdown
## Architecture Decision Records

Key technical decisions are documented in ADRs:

- ADR 001: [One sentence capturing the key decision]
- ADR 002: [One sentence capturing the key decision]
```

**Guidelines for summaries:**
- Focus on WHAT was decided, not WHY
- Keep it concise (one sentence, ~10-20 words)
- Include the chosen technology/approach
- Example: "Use signed JWT tokens in HTTP-only cookies for player authentication"

## Quality Checklist

After making changes, verify:
- ✅ Status is "Accepted"
- ✅ No "Options Considered" section remains
- ✅ Decision section is clear and affirmative (not comparative)
- ✅ No references to "Option 1", "Option 2", etc. anywhere in the document
- ✅ Implementation Details section is fully intact
- ✅ Consequences section is fully intact
- ✅ Document reads as if this was the only solution considered
- ✅ A senior engineer can implement from this document without confusion

## Summary to Provide User

After finalizing, tell the user:

```
Done! I've finalized ADR XXX by:

1. ✅ Updated status from "Proposed" to "Accepted"
2. ✅ Removed all alternative options (Options X, Y, Z)
3. ✅ Simplified the Decision section to focus on the selected solution
4. ✅ Cleaned up any remaining references to rejected options
5. ✅ Kept all implementation details intact
6. ✅ Updated CLAUDE.md with a one-sentence summary

The ADR is now locked in and ready for use as an implementation guide.
```

## Example Transformation

**Before Decision Section:**
```markdown
## Options Considered

### Option 1: Session-Based Auth
[... full description ...]

### Option 2: JWT Tokens (RECOMMENDED)
[... full description ...]

## Decision

**Selected Option: Option 2 - JWT Tokens**

JWT tokens strike the ideal balance because they're better than session-based auth...
```

**After Decision Section:**
```markdown
## Decision

We will use **Signed JWT Tokens in HTTP-Only Cookies** for player authentication.

### Approach
- Generate signed JWT when player joins game
- JWT contains claims: gameId, playerId, playerName
[...]

### Key Benefits
1. **Serverless-Optimized**: Stateless validation works perfectly...
[...]
```

## Expected User Input

When the user invokes this command, they should ideally provide:
1. Which ADR to finalize (number or filename)
2. Which option was selected (e.g., "Option 2", "JWT Tokens")

**Example invocation:**
```
/finalize-adr 001-auth.md with Option 2
```

If either piece of information is missing, prompt the user for it before proceeding.

Now proceed: Gather the necessary information from the user (ADR to finalize, selected option), then execute the finalization steps.
