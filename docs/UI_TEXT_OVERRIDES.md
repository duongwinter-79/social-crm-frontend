# UI Text Overrides

The CRM admin app supports controlled overrides for approved static UI text.

Code remains the source of truth:

- editable keys live in `apps/crm-admin/src/ui-text/ui-text.registry.ts`
- defaults live with each key in that registry
- runtime overrides are fetched from `GET /api/ui-text/overrides`
- the admin editor merges the registry with saved backend overrides

To add a new editable string:

1. Add a stable key to `ui-text.registry.ts`.
2. Add the same key to the backend manifest in `src/features/ui-text/ui-text-registry.ts`.
3. Replace the component `copy({ en, vi })` call with `useUiText().text("your.key")`.
4. Keep keys limited to static UI copy: labels, headers, helper text, empty states, warnings, and button text.

Do not use UI text overrides for routes, permissions, validation logic, enum values, CRM record fields, or stored evidence.

The first slice intentionally covers only app-shell navigation, selected Journey board text, and dossier titles. Convert more strings page by page.

## Preview Mode

The Admin -> UI Text editor can stage a draft override in browser-session preview before saving.

- Preview is local to the current browser session.
- Preview does not write to the backend.
- A shell banner appears while preview overrides are active.
- Saving or resetting a key clears that key from preview.
- App-shell and Journey board keys can open their affected screen directly; lead-specific keys require opening a real lead or dossier page manually.
