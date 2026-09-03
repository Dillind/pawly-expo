---
status: accepted
---

# Liquid glass is a progressive enhancement, never a dependency

Every use of `expo-glass-effect` must be guarded by `hasGlass` (`@/utils/platform`) and must render a complete, self-sufficient fallback when the guard fails. No layout, affordance, or legibility may depend on the glass effect being present.

This needs recording because the failure mode is silent and looks like nothing at all. `GlassView` does not error on an unsupported OS — it degrades to a plain `View`. A plain `View` with no `backgroundColor` is fully transparent, so an unguarded glass surface renders its children floating unbacked over whatever is behind them: no card, no edge, no separation. The component "works", the screen is broken, and it is broken only on the devices the developer is least likely to be running.

## Context

`expo-glass-effect` requires **iOS 26+**. `app.json` sets no `deploymentTarget` and does not include `expo-build-properties`, so the project's floor is the Expo SDK 57 default — far below 26. The gap is not a rounding error; it is most of the installed base.

The Expo docs add a second wrinkle: _some iOS 26 beta versions do not have the Liquid Glass API available_. So the guard has to be the runtime check the library ships, not a version comparison written by hand.

## Decision

- Glass is always **additive**. The fallback is the design; glass is what happens on top of it when the platform can do it.
- **`hasGlass` in `@/utils/platform` is the only permitted guard**, and the only place `isLiquidGlassAvailable()` is called. The OS version cannot change while the app runs, so it is read once at module load; a component that imports the library's check directly is the smell to look for.
- **Glass is the default wherever it is offered**, and the guard picks the fallback — not the other way round. A caller never asks for glass conditionally.
- The fallback for a glass surface is an opaque themed surface (`backgroundElement`) plus the shared shadow helpers in `src/lib/styles/shadows.ts` — i.e. the card this app would have drawn anyway.
- One component branches internally rather than callers choosing between a glass and a non-glass variant. Two visually distinct component trees for the same control would drift.

## Alternatives considered

- **Raise the deployment target to iOS 26.** Rejected outright. Trading the majority of addressable devices for a material effect is not a trade; it is a decision to not ship.
- **Let callers handle the fallback.** Rejected. It makes correctness opt-in, and the failure is invisible in the simulator the developer happens to have open. Containment inside the component is the same rule ADR 0008 applies to icons and ADR 0010 applies to `TrueSheet`: one file owns the primitive.
- **A JS blur (`expo-blur`) as the sub-26 fallback.** Rejected for now. It approximates the look but not the behaviour, costs a dependency on every screen that uses it, and ADR 0004's reasoning applies — this app prefers the platform's own thing or an honest plain one, not an imitation.

## Consequences

- **Two visual results ship simultaneously**, and both must be reviewed. A change that looks right on iOS 26 is not verified until the fallback path has been looked at.
- **`opacity` is off-limits for animating glass.** The docs are explicit that `opacity: 0` disables the effect entirely; animation goes through `glassEffectStyle`'s config object (`{ style, animate, animationDuration }`). This rules out the project's usual `PressableOpacity` press treatment on any glass surface — `GlassView`'s `isInteractive` provides the native press response instead. The fallback path keeps `PressableOpacity`, because without the material there is nothing to deform and the button would otherwise have no press feedback at all.
- **The iOS 26 floor is now recorded.** Anything else gated on iOS 26 (bottom accessories, tab bar minimise behaviour) can reference this ADR rather than rediscovering the constraint.
