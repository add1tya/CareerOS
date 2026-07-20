# CareerOS

Personal AI career operating system. Documentation lives in `docs/`.

## Setup

```bash
pnpm install
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your Supabase URL and anon key
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check |

Supabase: enable Email auth, set Site URL to `http://localhost:3000`, add redirect `http://localhost:3000/auth/callback`.

Run the migrations in `supabase/migrations/` (in filename order) in the Supabase SQL Editor before testing:

1. `20260716000001_create_profiles.sql` — profiles + onboarding
2. `20260716000002_career_graph_init.sql` — goals, constraints, Career Graph initialization
3. `20260716000003_skill_graph.sql` — skills, skill_dependencies, user_skill_mastery
4. `20260716000004_seed_ontology.sql` — AI engineering ontology seed (~48 skills + dependencies)
5. `20260716000005_skill_recommendations.sql` — Decision Engine v1 decision history (append-only)
6. `20260716000006_execution_engine.sql` — Execution Engine v1 (missions, quests, tasks)
7. `20260716000007_evidence_and_mastery.sql` — Evidence & Mastery v1 (append-only evidence, overlay updates)
8. `20260716000008_reflections.sql` — Reflection v1 (confirmation-gated self-assessment → evidence)
9. `20260716000009_history_events.sql` — History Event Log v1 (append-only Career Graph audit timeline)
