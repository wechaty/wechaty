# Instructions for coding agents

- Use node:test for a shared Node.js/Deno test suite; collect coverage natively in both runtimes, publish LCOV and HTML reports as GitHub Actions artifacts, and enforce independent, measured coverage regression baselines without third-party coverage services.
- Name all unit test files *.test.ts and colocate them with their source modules. Use *.integration.test.ts or *.e2e.test.ts only for broader tests requiring separate execution. Write portable tests using node:test and node:assert/strict, and ensure the shared unit test suite runs under both Node.js and Deno.
- Reference GitHub Actions by version tags (for example, `@v6`), not commit hashes.
- The package is ESM-only and needs the Node.js and npm versions in `engines`.
  Node.js runs the `.ts` sources directly; only packaging compiles to `dist/`.
  Relative imports must end in `.ts`;
- Use node:diagnostics_channel for lightweight, privacy-safe internal observability without third-party runtime dependencies. Preserve existing public events and logging; validate diagnostic and tracing channel behavior under both Node.js and Deno before relying on cross-runtime compatibility.

### Source Code Documentation (AI-First)

Treat source comments as maintained architectural and behavioral contracts for future coding agents.

- **File headers:** Every source file must begin with a concise documentation comment explaining **why the module exists, what it owns, its architectural boundaries, and its key relationships**. Omit details that are obvious from the code.
- **Function documentation:** Document every exported function, class, and method, plus nontrivial internal functions, using TSDoc-compatible `/** ... */` comments. Explain **purpose, behavioral contracts, preconditions, side effects, failure behavior, and invariants** where relevant. Keep trivial internal functions minimally documented.
- **Inline comments:** Explain non-obvious decisions, workarounds, compatibility requirements, and constraints that future agents must preserve. Prefer explaining **why**, not narrating **how** the code works.
- **Documentation maintenance:** Whenever code is added, modified, moved, or deleted, review and update all affected comments in the same change. Remove obsolete documentation and preserve relevant architectural intent.
- **Accuracy over volume:** Comments must describe current, verified behavior. Never invent requirements, guarantees, or design rationale. Keep documentation concise, specific, and free of redundant implementation descriptions.
- **Agent handoff:** Before completing a code change, verify that a future agent could understand the affected module's responsibility, public contracts, and critical constraints from its comments and code without relying on the current conversation or commit history.