---
name: grill-with-docs
description: A grilling session that challenges plans against the existing domain model, sharpens terminology, and updates documentation (CONTEXT.md, ADRs) inline as decisions crystallise. Use when user wants to stress-test a plan or design against the codebase's domain model, mentions "grill me", or wants decisions captured as living docs.
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies one-by-one. Ask questions one at a time. If a question can be answered by exploring the codebase, explore the codebase instead.

**Domain awareness practices:**

Look for existing documentation in standard locations. These are conventions for _where to look_ — the files or directories may not exist yet, so check before assuming:

- Single-context repos: `/CONTEXT.md` for the glossary, `/docs/adr/` for architecture decision records
- Multi-context repos: `/CONTEXT-MAP.md` pointing to context-specific files

Create files only when needed — not preemptively.

**During the session:**

1. **Challenge terminology conflicts** — flag when user language contradicts existing glossary
2. **Sharpen vague terms** — propose precise canonical alternatives
3. **Test with scenarios** — stress-test relationships with edge cases
4. **Cross-reference code** — surface contradictions between stated behaviour and actual implementation
5. **Update CONTEXT.md inline** — capture resolved terms immediately (glossary only, no implementation details)
6. **Offer ADRs sparingly** — only when decisions are hard to reverse, surprising without context, and result from genuine trade-offs
