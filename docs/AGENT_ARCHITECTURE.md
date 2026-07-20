# OMNIA — Agent Architecture (system, not just a model)

Source vision: Silicon Valley–level agents are **systems**. OMNIA is an **agent creation platform** that composes these blocks from Create interviews.

## Building blocks (1–20)

| # | Block | OMNIA status |
|---|--------|--------------|
| 1 | Brain (LLM) | Model Selection Engine · frontier prefers Claude/GPT-class |
| 2 | System prompt | Prompt Engineering + deterministic linter |
| 3 | Memory | Spec strategies session / episodic / long_term · share_context |
| 4 | Knowledge | Create Context library uploads · RAG/Qdrant in Compose |
| 5 | Tools | Architect template tools + frontier stack |
| 6 | Planning | Frontier prompt plans · Orchestrator Phase 2 |
| 7 | Decision making | Prompt/tool rules · full planner next |
| 8 | Workflows | Interview FSM · Celery for long jobs |
| 9 | Multi-agent | Planned |
| 10 | APIs | FastAPI + provider keys |
| 11 | UI | Next.js Explore / Create / Yours + Menu |
| 12 | Backend | FastAPI engines |
| 13 | Database | Postgres (Compose) · in-memory standalone demo |
| 14 | Auth | JWT + org roles · demo-login |
| 15 | File processing | Uploads + text extract · deeper parsers next |
| 16 | Voice | Mic STT 70+ languages · TTS optional |
| 17 | Image understanding | Attachments · vision path next |
| 18 | Code execution | Tool in spec · sandbox runner next |
| 19 | Evaluation | Stars, Wilson, composite, Advance |
| 20 | Learning | Advance from ratings · longer horizon with logs |

## Platform layers

- Agent Builder (Create interview)
- Prompt Generator + linter
- Tool Selector (architect)
- Knowledge Manager (context uploads)
- Testing Sandbox (Chat/Run + rate)
- Marketplace (Explore)
- Analytics (eval sidebar)
- Continuous Improvement (Advance)

## Architecture sketch

```text
User → Next.js → Auth → FastAPI
         ├─ LLM orchestration
         ├─ Memory / Knowledge
         └─ Planner / Tools / Eval → Answer
```

When expanding Phase 2+, prefer wiring **Planner/Orchestrator**, **real tool runners**, and **RAG**, before greenfield multi-agent — Phase 1 slice must stay correct end-to-end.
