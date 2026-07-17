# CareerOS Architecture Review Protocol

Whenever I ask you to produce an implementation plan for a sprint, **do not implement anything immediately**.

Your responsibility is to first produce the implementation plan only.

The plan should include:

- Architecture
- Data model
- File/folder changes
- Implementation order
- Definition of Done
- Explicit non-goals
- Open architectural questions (if any)

Stop after the plan and wait for my approval.

---

# After Plan Approval

After I approve the plan (possibly with refinements), incorporate **all approved refinements** into the implementation plan before writing any code.

Before implementation begins, perform one final architecture review using the principles below.

If you identify improvements that:

- do not significantly increase sprint scope,
- improve long-term maintainability,
- better align with the documented architecture,

present them as **Recommended Refinements** and wait for approval before implementation.

Only after approval should implementation begin.

---

# Architecture Review Principles

## 1. Prefer Evolution Over Convenience

Whenever introducing templates, schemas, generated artifacts, or persistent models, assume they will evolve.

If inexpensive versioning today avoids breaking changes later, recommend it.

Examples:

- `template_version`
- `schema_version`
- immutable identifiers

---

## 2. Separate Definitions From Instances

Never mix reusable definitions with generated user data.

Examples:

- Template ≠ Generated Mission
- Template ≠ Generated Task
- Ontology ≠ User Skill Graph
- Recommendation ≠ Execution
- Schema ≠ Runtime State

Even if implementation is simple, preserve these architectural boundaries.

---

## 3. Preserve Provenance

Every generated artifact should explain **why it exists**.

Whenever applicable, recommend recording fields such as:

- `generated_from_*`
- `source`
- `created_by`
- `template_version`
- `recommendation_id`
- `generated_at`

The system should always be explainable and auditable.

---

## 4. Prefer Lazy Generation

Avoid eagerly generating derived state.

Generate only what is currently needed.

Examples:

- Generate only the active Quest instead of an entire Mission.
- Compute Roadmaps rather than storing them.
- Materialize state only when it provides user value.

---

## 5. Prefer Deterministic Systems First

Until explicitly instructed otherwise:

- No Claude
- No LLM reasoning
- No adaptive planning
- No probabilistic ranking
- No autonomous generation

Implement deterministic architecture first.

AI should enhance an existing system, not replace it.

---

## 6. Protect Future Flexibility

If a small schema addition today significantly reduces future migrations, recommend it.

Examples:

- parent references
- immutable keys
- version fields
- extensible enums

Avoid unnecessary complexity, but do not introduce technical debt by omitting inexpensive extensibility.

---

## 7. Preserve Auditability

Whenever state changes, evaluate whether that change should remain traceable.

Where appropriate:

- prefer append-only history
- never overwrite reasoning
- never lose provenance
- align with the project's documentation-first philosophy

---

## 8. Scope Discipline

Each sprint should prove **exactly one architectural capability**.

Do not expand scope with adjacent features.

Explicitly list:

- what is included
- what is intentionally deferred
- why those items are deferred

---

# Final Deliverable Before Implementation

Before implementation begins, always provide a section titled:

## Recommended Refinements

This section should contain improvements that:

- improve long-term architecture,
- preserve consistency with existing documentation,
- avoid future refactoring,
- maintain deterministic behavior,
- do not materially increase sprint scope.

After presenting these refinements, **wait for my approval**.

Only begin implementation after I explicitly approve the refined plan.

---

# After Every Implementation

After completing implementation, always provide:

## 1. What Was Built

A concise summary of everything implemented.

## 2. Architectural Decisions

Explain:

- what decisions were made,
- why they were chosen,
- what alternatives were rejected.

## 3. Learning Notes

Explain the important concepts introduced in this sprint so I understand:

- what was built,
- how it works,
- why it was implemented that way.

Teach as if you are mentoring a junior engineer building CareerOS.

## 4. Manual Steps

Clearly list anything I must do manually (Supabase migrations, environment variables, dashboard configuration, etc.).

## 5. Verification

State whether:

- `typecheck`
- `lint`
- `build`

all pass.

## 6. Stop

Do **not** continue into the next sprint.

Stop after implementation and wait for my next instruction.