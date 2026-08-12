---
status: accepted
---

# Icon library is Lucide, gated through a typed icon map — not Phosphor, not direct imports

`phosphor-react-native` (the icon library `AGENTS.md` previously mandated) is replaced with `lucide-react-native`. Screens and components never import a Lucide icon directly — every icon is resolved through the shared `Icon` component (`src/components/core/icon.tsx`), which only knows about icons registered in `src/constants/icon-map.ts`.

## Considered options

- **Keep Phosphor, import icons directly at call sites** (status quo, rejected). Worked fine for 6 call sites, but every call site owned its own `size`/`color` wiring, and nothing stopped an icon from being imported straight from the package anywhere in the app — the set of icons actually bundled was implicit, discoverable only by grepping.
- **Swap to Lucide, keep direct per-call-site imports** (rejected). Lucide's own docs warn that importing broadly (or via its dynamic all-icons pattern) bloats the bundle; direct imports give no single place to see or constrain which icons the app ships.
- **Swap to Lucide, gated through a typed map + `Icon` primitive** (chosen). `icon-map.ts` is the only file allowed to import from `lucide-react-native`; adding an icon means adding one line there, which is also the only way it becomes selectable via `Icon`'s `name` prop. `IconName` (`keyof typeof iconMap`) makes the bundle's icon set visible in the type system, not just discoverable by grepping — and gives `Icon` a stable, library-independent prop surface for `IconButton` to build on later.

## Consequences

- Adding a new icon is now a two-step, reviewable action: confirm it exists on lucide.dev, add one line to `icon-map.ts`. A PR that adds an icon shows up as a one-line diff there, not a scattered import.
- Map keys are semantic, not required to match Lucide's export names (e.g. `caretDown` → Lucide's `ChevronDown`) — this preserves the app's existing icon vocabulary and means a future swap of one icon's underlying source doesn't touch call sites.
- `Icon` is decorative-only (hidden from the accessibility tree, no `accessibilityLabel` prop) by design — accessibility for tappable icon-only controls belongs to `IconButton` (not yet built), which will require a label. Don't add a11y props to `Icon` itself to route around that.
- All 6 existing Phosphor call sites were migrated in the same change that introduced this pattern, and `phosphor-react-native` was removed as a dependency — there is no transition period where both libraries are in use.
- If Lucide's icon set is ever missing something Phosphor had (e.g. a `weight`/fill-style variant — Lucide is stroke-only), that's a reason to *supersede* this ADR with a deliberate re-evaluation, not to quietly re-add a second icon library.
