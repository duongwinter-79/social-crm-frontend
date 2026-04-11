# UI Reuse Plan

## Source App

Reference frontend: `taiwan-xklđ-crm-1`

The source app was treated as a visual and workflow reference, not as production architecture to copy directly.

## Reused Directly

- Dark left navigation rail with compact operational grouping
- Slim white top header over a pale slate working surface
- Dense white panels with soft borders and rounded corners
- Indigo primary action language and muted slate secondary palette
- Badge-heavy state communication
- KPI strips, compact toolbars, and operator-first tables
- Route or modal workbench patterns with a strong detail surface

## Adapted

- Lead list and workbench layout were adapted to current backend payloads
- Orders management was adapted into an expandable workbench backed by current order and matching APIs
- Matching was adapted into a backend-triage console rather than a mock score simulator
- Capability-gated modules were adapted into roadmap shells instead of fake live modules
- Login was aligned to the same visual language while preserving the existing auth flow

## Intentionally Ignored

- Source mock data and embedded business constants
- Fake Zalo marketing, PDF parsing, and alert simulations
- Business rules implemented only in source-side UI logic
- Any workflow requiring backend coverage that does not yet exist in `social_crm_backend`

## Reuse Rules Applied In This Repo

- Reuse visual language, not source business content
- Keep backend-truth first for all active modules
- Use gated shells for unsupported areas instead of simulated features
- Prefer shared primitives in `packages/ui` over one-off styling where possible

## Resulting Frontend Direction

The admin app now follows the source CRM visual system while remaining constrained to the APIs that actually exist. This keeps the interface coherent without creating false expectations about unsupported operations.
