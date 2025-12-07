You are helping to create an Architecture Decision Record (ADR) for this project.

## Your Task

1. **Determine the next ADR number:**
   - Check the `.ai-docs/thoughts/decisions/` directory for existing ADRs
   - Identify the highest numbered ADR (e.g., if `001-auth.md` exists, next is `002`)
   - Use a zero-padded 3-digit format (001, 002, 003, etc.)

2. **Gather information from the user:**
   - What architectural decision needs to be documented?
   - What is the context and problem being solved?
   - What options are being considered?
   - Is there a recommended option? Why?

3. **Create a comprehensive ADR** at `.ai-docs/thoughts/decisions/XXX-topic.md` with the following structure:

## ADR Template Structure

```markdown
# ADR XXX: [Decision Title]

## Status
[Proposed | Accepted | Rejected | Deprecated | Superseded by ADR-YYY]

## Context

[Describe the architectural challenge, technical constraint, or design question that requires a decision. Include:]
- What problem are we solving?
- What are the requirements (functional, non-functional)?
- What are the constraints (technical, business, timeline)?
- Why is this decision important?

## Decision Drivers

[List the key factors influencing this decision, such as:]
- Performance requirements
- Developer experience
- Maintainability
- Cost considerations
- Security requirements
- Scalability needs
- Time to market
- Team expertise

## Options Considered

### Option 1: [Name]

**Approach:**
[Detailed description of this option]

**Pros:**
- [Advantage 1]
- [Advantage 2]
- [...]

**Cons:**
- [Disadvantage 1]
- [Disadvantage 2]
- [...]

**Security:** [Security assessment if applicable]

**Complexity:** [Low | Medium | High] - [Brief explanation]

---

### Option 2: [Name]

[Same structure as Option 1]

---

[Add more options as needed]

## Decision

**Selected Option: [Chosen option]**

### Rationale

[Explain why this option was chosen. Address:]
- How it best satisfies the decision drivers
- Why it's better than alternatives
- What trade-offs are acceptable and why
- How it aligns with project goals and constraints

## Implementation Details

[Provide concrete technical guidance for implementing this decision. Include:]
- Architecture diagrams or system design
- Data structures or schemas
- API contracts or interfaces
- Configuration requirements
- Code examples or pseudocode (where helpful)
- Integration points with existing systems
- Migration strategy (if replacing existing approach)

[The goal is to give a senior engineer enough detail to implement without additional architectural guidance]

## Consequences

### Positive

- [Positive outcome 1]
- [Positive outcome 2]
- [...]

### Negative

- [Negative outcome 1]
- [Negative outcome 2]
- [...]

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| [Risk description] | [How to prevent or handle] |
| [...] | [...] |

## Future Enhancements

[Optional section for potential improvements or extensions that are out of scope for now]

- [Enhancement 1]
- [Enhancement 2]
- [...]

## References

[Optional: Links to relevant documentation, blog posts, or prior art]

- [Reference 1]
- [Reference 2]
- [...]
```

## Guidelines for Quality ADRs

1. **Be Specific:** Include concrete examples, not just abstract principles
2. **Show Trade-offs:** Every option has pros and cons - be honest about them
3. **Provide Implementation Guidance:** A senior engineer should be able to execute from this document
4. **Consider Security:** Always evaluate security implications
5. **Think Long-term:** Address maintenance, scalability, and evolution
6. **Be Concise:** Thorough but not verbose - value the reader's time
7. **Use Consistent Formatting:** Follow the template structure
8. **Include Diagrams:** Where helpful (ASCII art, mermaid, or describe clearly)

## After Creating the ADR

1. Save the file to `.ai-docs/adr/XXX-topic.md`
2. Use a descriptive kebab-case filename (e.g., `002-database-schema.md`)
3. Summarize the decision and key implementation points for the user
4. Ask if any sections need more detail or clarification

Now, ask the user what architectural decision they want to document, or proceed if they've already provided the topic.
