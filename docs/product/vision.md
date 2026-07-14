# Product Vision

Status: Foundational document. Revisit quarterly. Changes here should be rare and deliberate.

---

## Vision Statement

CareerOS is a navigation system for long-horizon personal transformation. Given a starting state, a destination, and real-world constraints, it continuously computes the highest-expected-value next action — the way a mapping application recomputes a route when traffic changes, rather than handing over a fixed itinerary and walking away.

## Mission

To replace static, one-time career plans with a living decision engine that adapts as fast as the person using it changes.

## Problem Statement

People pursuing ambitious, multi-year skill transitions — a mechanical engineer becoming an AI engineer, for instance — do not fail because they lack motivation or intelligence. They fail because of **compounding decision debt**:

- No reliable way to know if today's task is actually the highest-leverage use of today's hours.
- No visibility into whether skill is actually accumulating, versus activity that merely feels productive.
- Plans that are accurate on day one and stale by day thirty, because they were never designed to update.
- A wall of undifferentiated resources (courses, articles, roadmaps) with no mechanism to rank them against the individual's actual gaps and goals.

This is fundamentally a **planning-under-uncertainty** problem, and today it is solved with static artifacts — spreadsheets, downloaded roadmaps, bookmarked "best AI engineer roadmap 2026" posts — none of which can reason about the individual's specific, changing state.

## Existing Solutions

| Category | Examples | What it provides |
|---|---|---|
| Static roadmaps | Blog posts, GitHub "awesome" lists, YouTube roadmap videos | A generic sequence of topics, identical for every reader |
| Course platforms | Coursera, Udemy, DeepLearning.AI | Structured content within one course; no cross-course prioritization |
| Habit/task trackers | Todoist, Notion, Habitica | Generic task and habit tracking with no domain understanding of skill dependencies |
| Career coaching | Human coaches, mentors | Genuine adaptive reasoning, but expensive, low-frequency, and not always available at the moment a decision is needed |
| Resume/job tools | LinkedIn, Teal, Resume Worded | Optimized for the job-search endpoint, not the multi-month skill-building journey that precedes it |

## Why Existing Solutions Fail

Every category above solves a narrower problem than the one that actually matters:

- **Static roadmaps** are the same for everyone, regardless of starting skill level, domain background, or available hours. They cannot account for the fact that a mechanical engineer entering AI has a different optimal path than a CS graduate — the mechanical engineer may need less time on basic programming fundamentals and more time on translating domain knowledge into applied ML use cases.
- **Course platforms** optimize for completion of their own content, not for the learner's actual end goal. They have no incentive, and no mechanism, to tell a learner "skip module 4, it's not relevant to your gap."
- **Task trackers** treat all tasks as equivalent units of work. They have no model of skill dependency, no concept that "learn linear algebra" unlocks "understand backpropagation," and cannot re-rank priorities as the learner's skill graph changes.
- **Human coaching** is the closest analog to what CareerOS wants to be — genuinely adaptive, personalized reasoning — but is bottlenecked by cost and availability. It cannot be consulted daily, at the moment a decision is actually needed.
- **Resume/job tools** start too late. By the time a resume needs optimizing, the actual skill-building decisions have already been made, well or badly, over the preceding months.

The common failure mode: **none of these systems hold a live, structured model of the individual.** They operate on generic content, not on the person's specific graph of skills, goals, constraints, and history.

## User Promise

At any moment, opening CareerOS answers one question with confidence: **"What is the single highest-value thing I should be doing right now, and why?"**

This promise has three components that must all hold simultaneously:

1. **Grounded** — the recommendation is based on the user's actual current skill state, not a generic curriculum position.
2. **Explainable** — the user can always see why a task was recommended (which skill gap it closes, which goal it serves).
3. **Adaptive** — the recommendation changes as the user's real progress, available time, or goals change, without requiring the user to manually re-plan.

## Version 1 Scope

V1 is built for exactly one user (the founder) and optimizes for personal utility over generality, market-readiness, or polish.

**In scope:**

- **Onboarding interview** — a structured, conversational intake (current skills, goal state, weekly hours, constraints) that produces the initial skill graph and roadmap.
- **Skill graph visualization** — a structured, queryable representation of skills, their dependencies, and current mastery level, specific to the AI engineering domain.
- **Daily task engine** — continuously computes and surfaces the highest-value next task(s) given the current skill graph, goal, and available time.
- **Mentor chat** — an LLM-backed conversational interface (Claude API) for reasoning through decisions, asking questions, and getting the roadmap re-explained or re-planned on demand.

**Explicitly out of scope for V1:**

- Multi-user support or authentication complexity beyond what Supabase provides by default
- Monetization, billing, or subscription infrastructure
- Public-facing marketing site or landing page
- Mobile app (web-first, responsive is sufficient)
- Integrations with external job boards, LinkedIn, or resume builders
- Team/enterprise features of any kind
- Notification systems beyond basic in-app state

## Long-Term Evolution

If, after approximately one year of personal use, CareerOS has demonstrably improved decision quality and adherence for its founder, the following evolutions become candidates — evaluated only at that point, not designed for prematurely:

1. **Domain packs** — the skill-graph and task-engine architecture generalizes beyond "AI engineering" to other long-horizon transitions (e.g., mechanical-to-software, individual-contributor-to-founder).
2. **Multi-user product** — proper auth, isolated user data, and onboarding polish, opening the tool to a small group of trusted early users before any broader release.
3. **Coaching-as-a-service layer** — the mentor chat becomes sophisticated enough to reduce reliance on human coaching for early-stage career transitions.

None of these are commitments. They are documented here only so that, if V1 succeeds, the next decision is made deliberately rather than reactively.

## Product Boundaries

CareerOS is:

- A personal decision-support system for long-horizon skill and career transitions.
- A living model of one person's skills, goals, and constraints.
- A daily-use tool, not a one-time planning exercise.

CareerOS is **not**:

- A course platform or content library.
- A generic task manager.
- A resume or job-application tool.
- A social or community product.
- A replacement for human mentorship — it is a complement, always available between mentorship conversations.

## Success Metrics

V1 success is measured qualitatively first, quantitatively second, because the user base is one person and statistical metrics are not meaningful at that scale.

**Primary (qualitative):**

- The founder actually opens and acts on CareerOS's recommendations on a majority of active days, without needing external willpower to do so.
- The founder can point to specific instances where CareerOS's recommendation was demonstrably better than what an unaided static plan would have suggested.

**Secondary (quantitative, tracked but not optimized for in V1):**

- Daily active usage (self-tracked, single user)
- Skill graph nodes moved from "unstarted" to "in progress" to "competent" over time
- Ratio of recommended tasks completed vs. skipped or overridden
- Time from stated goal to first working, demonstrable skill graph and task engine (target: 8 weeks for MVP)
