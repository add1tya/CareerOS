# Guiding Principles

Status: Living document, but changes require deliberate justification, not convenience. Every engineer (human or AI agent) working on this codebase is expected to have read this before writing code.

These principles are organized into five groups: Process, Architecture, Product Integrity, AI Behavior, and Data & Trust.

---

## Process

**1. Documentation before implementation.**
No feature is built before its purpose, inputs, outputs, and success criteria are written down. This is not bureaucracy — for a single founder-engineer, documentation is the mechanism that prevents rebuilding the same decision three times because it was never externalized.

**2. Every feature must trace to the user promise.**
"What is the highest-value thing to do right now, and why?" If a proposed feature does not make that question easier to answer, it is deprioritized, regardless of how interesting it is to build.

**3. Scope down before scoping up.**
When uncertain whether a feature belongs in V1, the default answer is no. Features are added back deliberately once the smaller version has proven insufficient in actual use — not preemptively.

**4. Build the minimum artifact that produces a real signal.**
A working, ugly onboarding flow that produces a real skill graph is worth more than a polished onboarding flow that produces mock data. Fidelity of underlying logic beats fidelity of visual polish, in that order, for every V1 feature.

**5. Weekly reality check against the roadmap.**
The system (and the founder, reviewing it) should compare actual pace against planned pace weekly, not monthly. Drift compounds silently; monthly reviews catch it too late to correct cheaply.

**6. Dogfood before demo.**
No feature is considered done until the founder has used it, personally, to make a real decision. A feature that only exists to be shown is not finished.

---

## Architecture

**7. No unnecessary complexity.**
Every abstraction, service, or dependency must justify its existence against the complexity it adds. A single Next.js app with Supabase and direct Claude API calls is the default architecture until a specific, demonstrated need forces a departure from it.

**8. Prefer computed views over stored derived state.**
The daily task list, the current roadmap, and priority rankings should be derivable on demand from the skill graph and user state, not pre-computed and stored as static content that can silently go stale. Store facts (skills, completions, constraints); compute recommendations.

**9. The skill graph is the single source of truth for progress.**
No feature is permitted to track progress in a way that is not ultimately reducible to a change in the skill graph. Two disconnected notions of "progress" in the same system is a data-integrity risk, not a convenience.

**10. Design the data model for one user, but never hard-code that assumption into the schema.**
Every table includes a user identifier from day one, even though V1 has exactly one user. Retrofitting multi-tenancy later is expensive; including the column now is free.

**11. The reasoning trace is a first-class artifact.**
Whenever the system generates a recommendation, the explanation for that recommendation is stored alongside it, not regenerated on demand and potentially inconsistent with what was originally shown to the user.

**12. Idempotent, replayable AI calls.**
Any call to the Claude API that mutates state (e.g., updates the skill graph) should be structured so that the same input produces a consistent, auditable output, and so that a failed or retried call cannot silently corrupt state.

**13. Fail loud, not silent.**
If the AI reasoning layer cannot produce a confident recommendation, or an API call fails, the system says so explicitly in the UI. It never silently falls back to a stale or default recommendation without indicating that it has done so.

**14. Version the skill graph schema from the start.**
The taxonomy of skills and dependencies for "AI engineering" will change as the founder's own understanding of the domain improves. The schema must support migration of existing user data across taxonomy versions without data loss.

---

## Product Integrity

**15. Every screen must answer a specific user question.**
Before building a screen, name the exact question it answers ("What should I do today?", "Where am I behind pace?", "What does this skill unlock?"). A screen that does not have a one-sentence answer to this does not get built.

**16. Everything measurable.**
Every feature ships with a definition of what "working" looks like in measurable terms (usage frequency, override rate, completion rate) before it ships, not after.

**17. Everything explainable.**
No recommendation, score, or ranking is shown to the user without a visible, honest explanation of how it was derived. "Trust me" is not an acceptable UX pattern anywhere in this product.

**18. Overrides are signal, not errors.**
When the user disagrees with a recommendation and overrides it, the system logs this as information about a possible model gap, not as a failure state to minimize or hide.

**19. Default to showing uncertainty, not hiding it.**
If the system has low confidence in a recommendation (e.g., insufficient completed tasks to estimate pace), this is shown, not smoothed over with a falsely confident number.

**20. No feature ships that the founder would not trust with their own real career decisions.**
This is the sharpest possible bar, and deliberately so: since the founder is the only user, any feature that would not survive being relied on for a real decision has no reason to exist in V1.

---

## AI Behavior

**21. AI augments human judgment. It never manipulates it.**
No dark patterns: no artificial urgency, no guilt-based streak mechanics, no engagement-maximizing notification design. Every persuasive element must be justifiable as being in the user's own stated interest, not the app's engagement metrics.

**22. The AI must be able to say "I don't know" or "I'm not confident."**
A recommendation engine that always produces a confident-sounding answer, even when the underlying signal is weak, actively degrades trust over time once the user discovers the confidence was unwarranted.

**23. Prompts and reasoning logic are versioned and reviewed like code.**
Changes to the prompts that drive the mentor chat, skill graph updates, or task recommendations go through the same review discipline as application code — they are not treated as disposable strings.

**24. The mentor chat never pretends to be a human.**
It is presented, consistently, as an AI reasoning layer with visibility into the user's data — not as a persona designed to simulate human companionship. Its value is reasoning quality and availability, not the illusion of relationship.

**25. AI-driven prioritization must be re-derivable from stated goals and constraints.**
If the founder cannot look at a recommendation and trace it back to a specific goal, constraint, or skill gap, the recommendation is not trustworthy enough to ship, regardless of how plausible it looks.

**26. Bias toward building over consuming, but never dogmatically.**
The task engine defaults to recommending applied, built work over passive content consumption, but must be able to recognize when foundational conceptual learning genuinely must precede building (e.g., basic linear algebra before implementing backpropagation from scratch).

---

## Data & Trust

**27. The user owns their data, fully and legibly.**
All user data (skill graph state, task history, chat history) must be exportable in a plain, human-readable format at any time. This is a personal tool; the founder must never be locked out of their own career data by their own product.

**28. No dark data collection.**
The system collects only what it needs to compute recommendations and track progress. It does not instrument engagement metrics that exist only to optimize retention rather than outcome quality.

**29. Sensitive personal context is handled with the same care regardless of user count.**
Even with a single user, credentials, API keys, and personal career data are handled as if the system had thousands of users — least-privilege access, no secrets in client code, no logging of raw personal data to third-party analytics.

**30. Recompute rather than trust cached judgments indefinitely.**
Skill mastery estimates and recommendations have an implicit shelf life. The system should treat old, unverified assessments of skill level as decaying in confidence over time, not as permanently true once set.

---

## Meta-Principle

**31. This document is a constraint on convenience, not a constraint on judgment.**
When a principle above appears to conflict with good judgment in a specific situation, the resolution is to explicitly amend this document with reasoning, not to silently violate it. Undocumented exceptions are how founding documents rot.
