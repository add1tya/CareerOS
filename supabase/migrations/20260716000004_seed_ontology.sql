-- Sprint 4: AI Engineering ontology seed (v1), extracted 1:1 from
-- docs/domain/ai-engineering-knowledge-model.md §2 (nine clusters) and §4
-- (Core/Advanced/Specialization/Future categorization).
--
-- This is GLOBAL, user-agnostic reference content (the required capabilities).
-- Per-user mastery lives in user_skill_mastery, never here.
-- skill_key values are IMMUTABLE identifiers (ADR-0001) — never rename.
-- Idempotent: safe to re-run (on conflict do nothing / refresh metadata).

insert into public.skills
  (skill_key, name, description, domain, ontology_category, difficulty,
   estimated_hours_min, estimated_hours_max, transferability, display_order)
values
  -- 2.1 Programming & Systems Foundations
  ('python', 'Python', 'The primary implementation language for nearly all AI engineering work.', 'programming_systems', 'core', 'medium', 150, 250, 'very_high', 1),
  ('typescript', 'TypeScript', 'Typed language for building the application layer that wraps AI systems.', 'programming_systems', 'advanced', 'medium', 80, 150, 'high', 2),
  ('git', 'Git & Version Control', 'The mechanism by which all code changes are tracked, reviewed, and collaborated on.', 'programming_systems', 'core', 'low', 20, 40, 'very_high', 3),
  ('linux', 'Linux & Command Line', 'The operating environment for nearly all production AI infrastructure.', 'programming_systems', 'core', 'medium', 60, 100, 'very_high', 4),
  ('networking-fundamentals', 'Networking Fundamentals', 'How systems communicate — DNS, HTTP, TCP/IP, load balancing.', 'programming_systems', 'advanced', 'medium', 40, 80, 'very_high', 5),

  -- 2.2 Computer Science Theory
  ('cs-fundamentals', 'Computer Science Fundamentals', 'The conceptual substrate (computation, complexity, abstraction) beneath all other CS domains.', 'cs_theory', 'core', 'high', 100, 150, 'very_high', 6),
  ('data-structures', 'Data Structures', 'Representing and organizing information efficiently — arrays, trees, graphs, hash maps, heaps.', 'cs_theory', 'core', 'medium', 60, 100, 'very_high', 7),
  ('algorithms', 'Algorithms', 'Systematic methods for solving computational problems efficiently.', 'cs_theory', 'core', 'high', 100, 150, 'very_high', 8),
  ('operating-systems', 'Operating Systems', 'Processes, memory, concurrency, and scheduling — the substrate every program runs on.', 'cs_theory', 'advanced', 'high', 100, 150, 'very_high', 9),

  -- 2.3 Data & Backend Infrastructure
  ('databases', 'Databases', 'How data is modeled, stored, and queried reliably — relational theory, transactions, indexing.', 'data_backend_infra', 'core', 'medium', 60, 100, 'very_high', 10),
  ('sql', 'SQL', 'The practical query language for relational data.', 'data_backend_infra', 'core', 'medium', 40, 80, 'very_high', 11),
  ('backend-development', 'Backend Development', 'Server-side systems (APIs, business logic, data access) that any AI product needs beyond the model.', 'data_backend_infra', 'advanced', 'high', 150, 250, 'very_high', 12),
  ('frontend-development', 'Frontend Development', 'The user-facing interface through which people interact with AI systems.', 'data_backend_infra', 'advanced', 'medium', 100, 150, 'very_high', 13),
  ('cloud-computing', 'Cloud Computing', 'Deploying, scaling, and operating systems on shared cloud infrastructure.', 'data_backend_infra', 'advanced', 'high', 100, 150, 'very_high', 14),
  ('docker', 'Docker', 'Packaging applications and dependencies into portable, reproducible containers.', 'data_backend_infra', 'advanced', 'medium', 30, 60, 'very_high', 15),
  ('kubernetes', 'Kubernetes', 'Orchestrating containerized workloads at scale — scheduling, scaling, self-healing.', 'data_backend_infra', 'specialization', 'very_high', 150, 250, 'high', 16),

  -- 2.4 Mathematical Foundations
  ('linear-algebra', 'Linear Algebra', 'The mathematical language of vectors, matrices, and transformations underlying modern ML.', 'math', 'core', 'high', 100, 150, 'high', 17),
  ('calculus', 'Calculus', 'Rates of change and optimization — how gradients drive learning via backpropagation.', 'math', 'core', 'medium', 60, 100, 'high', 18),
  ('probability', 'Probability', 'Reasoning about uncertainty — the basis for model outputs being distributions.', 'math', 'core', 'medium', 60, 100, 'very_high', 19),
  ('statistics', 'Statistics', 'Drawing valid conclusions from data — hypothesis testing, distributions, significance, bias.', 'math', 'core', 'medium', 60, 100, 'very_high', 20),
  ('optimization', 'Optimization', 'Finding the best solution within constraints — underlies how models are trained.', 'math', 'advanced', 'high', 80, 120, 'high', 21),

  -- 2.5 Core Machine Learning & Deep Learning
  ('machine-learning', 'Machine Learning', 'Building systems that improve from data — the umbrella above Deep Learning.', 'core_ml_dl', 'core', 'high', 150, 200, 'high', 22),
  ('deep-learning', 'Deep Learning', 'Neural network-based ML — the family underlying essentially all modern generative AI.', 'core_ml_dl', 'core', 'very_high', 200, 300, 'high', 23),
  ('pytorch', 'PyTorch', 'The dominant practical framework for implementing, training, and experimenting with deep learning models.', 'core_ml_dl', 'core', 'medium', 80, 120, 'high', 24),
  ('tensorflow', 'TensorFlow', 'An alternative major deep learning framework, historically dominant in production/mobile.', 'core_ml_dl', 'specialization', 'medium', 40, 60, 'low', 25),

  -- 2.6 LLM & Generative AI Systems
  ('transformers', 'Transformers', 'The neural network architecture underlying essentially all modern large language models.', 'llm_genai_systems', 'core', 'very_high', 100, 150, 'low', 26),
  ('llms', 'Large Language Models', 'Applied understanding of how large-scale pretrained language models are built, behave, and are used.', 'llm_genai_systems', 'core', 'high', 100, 150, 'medium', 27),
  ('embeddings', 'Embeddings', 'Representing meaning as vectors in a continuous space, enabling similarity-based reasoning.', 'llm_genai_systems', 'advanced', 'medium', 40, 60, 'high', 28),
  ('vector-databases', 'Vector Databases', 'Storage systems optimized for fast similarity search over high-dimensional embedding vectors.', 'llm_genai_systems', 'advanced', 'medium', 40, 60, 'medium', 29),
  ('prompt-engineering', 'Prompt Engineering', 'Systematically designing inputs to language models to reliably elicit desired behavior.', 'llm_genai_systems', 'core', 'medium', 30, 60, 'medium', 30),
  ('rag', 'Retrieval-Augmented Generation (RAG)', 'Combining retrieval with generation to produce grounded, source-attributable outputs.', 'llm_genai_systems', 'advanced', 'high', 60, 100, 'medium', 31),
  ('agentic-ai', 'Agentic AI', 'Systems where a model plans and executes multi-step actions rather than a single response.', 'llm_genai_systems', 'advanced', 'high', 80, 120, 'medium', 32),
  ('langchain-langgraph', 'LangChain / LangGraph', 'Orchestration frameworks for building LLM applications, chains, and agentic workflows.', 'llm_genai_systems', 'specialization', 'medium', 30, 50, 'low', 33),

  -- 2.7 Evaluation, Training & Production ML
  ('model-evaluation', 'Model Evaluation', 'Rigorously measuring whether a model or system is actually good, and with what confidence.', 'evaluation_training_production', 'core', 'high', 60, 100, 'high', 34),
  ('fine-tuning', 'Fine-Tuning', 'Adapting a pretrained model''s weights to a specific task or domain.', 'evaluation_training_production', 'advanced', 'high', 80, 120, 'low', 35),
  ('inference-model-serving', 'Inference & Model Serving', 'Running trained models efficiently in production — latency, throughput, batching.', 'evaluation_training_production', 'advanced', 'high', 60, 100, 'high', 36),
  ('mlops', 'MLOps', 'Reliably building, deploying, monitoring, and maintaining ML systems over their lifecycle.', 'evaluation_training_production', 'advanced', 'high', 100, 150, 'high', 37),

  -- 2.8 Software & Systems Engineering
  ('ci-cd', 'CI/CD', 'Automating the build, test, and deployment pipeline so changes ship reliably and frequently.', 'software_systems_engineering', 'advanced', 'medium', 40, 60, 'very_high', 38),
  ('system-design', 'System Design', 'Reasoning about the architecture of large, real-world systems under constraints.', 'software_systems_engineering', 'advanced', 'high', 100, 150, 'very_high', 39),
  ('software-architecture', 'Software Architecture', 'Structuring a codebase''s internal organization so it remains maintainable as it grows.', 'software_systems_engineering', 'specialization', 'high', 100, 150, 'very_high', 40),
  ('security', 'Security', 'Protecting systems and data from unauthorized access, misuse, and attack.', 'software_systems_engineering', 'advanced', 'high', 80, 120, 'very_high', 41),
  ('monitoring-observability', 'Monitoring & Observability', 'Understanding what a running system is actually doing in production — logs, metrics, traces.', 'software_systems_engineering', 'specialization', 'medium', 40, 80, 'very_high', 42),
  ('distributed-systems', 'Distributed Systems', 'Reasoning about systems of multiple independent, communicating machines.', 'software_systems_engineering', 'specialization', 'very_high', 150, 250, 'high', 43),

  -- 2.9 Meta-Skills
  ('projects', 'Projects (Applied Portfolio Building)', 'Converting learned skills into real, demonstrable, built artifacts.', 'meta_skills', 'core', 'medium', 0, 0, 'very_high', 44),
  ('open-source-contribution', 'Open Source Contribution', 'Contributing to real, shared codebases maintained by others.', 'meta_skills', 'specialization', 'medium', 40, 80, 'very_high', 45),
  ('communication', 'Communication', 'Clearly conveying technical ideas, decisions, and trade-offs to varied audiences.', 'meta_skills', 'core', 'medium', 40, 80, 'very_high', 46),
  ('product-thinking', 'Product Thinking', 'Reasoning about what to build and why, from the perspective of the actual problem and user.', 'meta_skills', 'future', 'high', 0, 0, 'very_high', 47),
  ('leadership', 'Leadership', 'Enabling other people''s work to be more effective through direction, delegation, and feedback.', 'meta_skills', 'future', 'high', 0, 0, 'very_high', 48)
on conflict (skill_key) do update set
  name = excluded.name,
  description = excluded.description,
  domain = excluded.domain,
  ontology_category = excluded.ontology_category,
  difficulty = excluded.difficulty,
  estimated_hours_min = excluded.estimated_hours_min,
  estimated_hours_max = excluded.estimated_hours_max,
  transferability = excluded.transferability,
  display_order = excluded.display_order,
  ontology_version = excluded.ontology_version;

-- Dependency edges (parent must precede child), from each domain's "Dependencies" field.
-- Default type 'hard' / minimum_mastery 0.30 (conservative; roadmap OQ-01).
insert into public.skill_dependencies (parent_skill_key, child_skill_key, type)
values
  ('python', 'typescript', 'soft'),
  ('linux', 'networking-fundamentals', 'hard'),
  ('python', 'cs-fundamentals', 'soft'),
  ('cs-fundamentals', 'data-structures', 'hard'),
  ('python', 'data-structures', 'hard'),
  ('data-structures', 'algorithms', 'hard'),
  ('cs-fundamentals', 'algorithms', 'hard'),
  ('cs-fundamentals', 'operating-systems', 'hard'),
  ('linux', 'operating-systems', 'hard'),
  ('cs-fundamentals', 'databases', 'hard'),
  ('databases', 'sql', 'hard'),
  ('python', 'backend-development', 'hard'),
  ('typescript', 'backend-development', 'soft'),
  ('databases', 'backend-development', 'hard'),
  ('networking-fundamentals', 'backend-development', 'hard'),
  ('typescript', 'frontend-development', 'hard'),
  ('linux', 'cloud-computing', 'hard'),
  ('networking-fundamentals', 'cloud-computing', 'hard'),
  ('linux', 'docker', 'hard'),
  ('docker', 'kubernetes', 'hard'),
  ('cloud-computing', 'kubernetes', 'hard'),
  ('networking-fundamentals', 'kubernetes', 'hard'),
  ('probability', 'statistics', 'hard'),
  ('calculus', 'optimization', 'hard'),
  ('linear-algebra', 'optimization', 'hard'),
  ('linear-algebra', 'machine-learning', 'hard'),
  ('calculus', 'machine-learning', 'hard'),
  ('probability', 'machine-learning', 'hard'),
  ('statistics', 'machine-learning', 'hard'),
  ('python', 'machine-learning', 'hard'),
  ('machine-learning', 'deep-learning', 'hard'),
  ('linear-algebra', 'deep-learning', 'hard'),
  ('calculus', 'deep-learning', 'hard'),
  ('optimization', 'deep-learning', 'hard'),
  ('python', 'pytorch', 'hard'),
  ('deep-learning', 'pytorch', 'hard'),
  ('deep-learning', 'tensorflow', 'hard'),
  ('deep-learning', 'transformers', 'hard'),
  ('linear-algebra', 'transformers', 'hard'),
  ('pytorch', 'transformers', 'hard'),
  ('transformers', 'llms', 'hard'),
  ('deep-learning', 'llms', 'hard'),
  ('linear-algebra', 'embeddings', 'hard'),
  ('transformers', 'embeddings', 'hard'),
  ('embeddings', 'vector-databases', 'hard'),
  ('databases', 'vector-databases', 'hard'),
  ('llms', 'prompt-engineering', 'hard'),
  ('embeddings', 'rag', 'hard'),
  ('vector-databases', 'rag', 'hard'),
  ('prompt-engineering', 'rag', 'hard'),
  ('llms', 'rag', 'hard'),
  ('llms', 'agentic-ai', 'hard'),
  ('prompt-engineering', 'agentic-ai', 'hard'),
  ('rag', 'agentic-ai', 'hard'),
  ('backend-development', 'agentic-ai', 'hard'),
  ('rag', 'langchain-langgraph', 'hard'),
  ('agentic-ai', 'langchain-langgraph', 'hard'),
  ('prompt-engineering', 'langchain-langgraph', 'hard'),
  ('statistics', 'model-evaluation', 'hard'),
  ('probability', 'model-evaluation', 'hard'),
  ('pytorch', 'fine-tuning', 'hard'),
  ('transformers', 'fine-tuning', 'hard'),
  ('model-evaluation', 'fine-tuning', 'hard'),
  ('deep-learning', 'inference-model-serving', 'hard'),
  ('backend-development', 'inference-model-serving', 'hard'),
  ('docker', 'inference-model-serving', 'hard'),
  ('docker', 'mlops', 'hard'),
  ('cloud-computing', 'mlops', 'hard'),
  ('ci-cd', 'mlops', 'hard'),
  ('model-evaluation', 'mlops', 'hard'),
  ('git', 'ci-cd', 'hard'),
  ('docker', 'ci-cd', 'hard'),
  ('data-structures', 'system-design', 'hard'),
  ('algorithms', 'system-design', 'hard'),
  ('databases', 'system-design', 'hard'),
  ('networking-fundamentals', 'system-design', 'hard'),
  ('backend-development', 'software-architecture', 'hard'),
  ('system-design', 'software-architecture', 'hard'),
  ('backend-development', 'security', 'hard'),
  ('networking-fundamentals', 'security', 'hard'),
  ('backend-development', 'monitoring-observability', 'hard'),
  ('cloud-computing', 'monitoring-observability', 'hard'),
  ('operating-systems', 'distributed-systems', 'hard'),
  ('networking-fundamentals', 'distributed-systems', 'hard'),
  ('system-design', 'distributed-systems', 'hard'),
  ('git', 'open-source-contribution', 'hard'),
  ('communication', 'open-source-contribution', 'soft'),
  ('communication', 'product-thinking', 'hard'),
  ('communication', 'leadership', 'hard'),
  ('product-thinking', 'leadership', 'hard')
on conflict (parent_skill_key, child_skill_key) do nothing;
