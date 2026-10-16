---
description: Mandatory 5-document project lifecycle standards
alwaysApply: true
---

# Mandatory Project Documentation Standards

For every project and for every major iteration/feature update, Antigravity MUST maintain, generate, and keep updated the following 5 core architectural and product documents in the `docs/` directory:

## Core Documents Matrix

1. **`docs/1_PRD.md` (Product Requirements Document)**:
   - Defines **WHAT** we are building and the core problem being solved.
   - Target personas, user journeys, functional requirements, and success metrics.
   - In-scope vs. Out-of-scope boundaries.

2. **`docs/2_TECHNICAL_ARCHITECTURE.md` (Technical Architecture Document)**:
   - Explains **HOW** the system is engineered and structured.
   - Component topology, service boundaries, communication protocols (HTTP/REST/WebSockets).
   - Database schemas, table relationships, and data lifecycle.
   - Third-party integrations (APIs, AI models, message queues, external brokers).

3. **`docs/3_SECURITY_AND_ACCESS.md` (Security & Access Document)**:
   - Defines authentication mechanisms, authorization levels, and role permissions.
   - Credential handling (e.g. app passwords, secrets, OAuth, tokens).
   - Data privacy, network security (CORS, SSL/TLS, headers), rate-limiting, and injection defenses.

4. **`docs/4_FRONTEND_SPEC.md` (Frontend Spec Document)**:
   - Detailed UI/UX specification: design tokens, color palette, typography, glassmorphism.
   - Component hierarchy, state flows, responsive grid breakpoints, and interaction models.
   - Micro-animations, accessibility (a11y), keyboard shortcuts, and sound/haptic feedback.

5. **`docs/5_FEATURE_TICKET_LIST.md` (Feature Ticket List)**:
   - Actionable development task breakdown with unique Ticket IDs (e.g., `RADAR-001`).
   - Priority rankings (P0 Critical, P1 High, P2 Polish/Future).
   - Clear acceptance criteria, status markers (`[x] DONE`, `[ ] IN PROGRESS`, `[ ] BACKLOG`), and dependencies.

## Continuous Synchronization Protocol
- Whenever code changes modify architecture, APIs, frontend UI, security policies, or features, the relevant documents in `docs/` MUST be updated in tandem.
- Never leave documentation stale or out of sync with actual codebase implementations.
