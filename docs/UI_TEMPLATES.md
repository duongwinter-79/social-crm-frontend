# UI Templates

Admins can switch and edit the CRM admin app's look at runtime, similar to a WordPress/Elementor theme with custom code. A template changes presentation only: routes, permissions, workflows and data stay in code and are untouched.

Open **Admin → UI templates** (`/ui-templates`, full admins only).

## What a template contains

| Part | What it does | Where it applies |
|---|---|---|
| Colours | One colour per family (accent, neutral, success, warning, danger). A full 50–950 shade scale is generated from it. | Every screen, including the login page |
| Font | A CSS font stack. Load web fonts with `@import` in Custom CSS. | Every screen |
| Brand | Brand name, tagline and logo (https URL, `/path`, or an uploaded image up to 200 KB). | Sidebar and login page |
| Custom CSS | Loaded after the app's own styles. | Signed-in screens only, **never on the login page**; skipped in safe mode |
| Custom JS | Runs once per page load with the `crm` API below. | Signed-in sessions only, **never on the login page**; skipped in safe mode |

At most one template is active. With none active the app uses its built-in look, which is pixel-identical to the pre-template app.

## Workflow

1. **New template** (or **Import JSON**, or **Duplicate** an existing one).
2. Edit colours, brand, CSS and JS. **Live preview in my browser** applies the draft to your session only. Colours, brand and CSS follow your edits as you type; the script only re-runs when you click **Run updated script in preview**, so half-typed code never executes. The preview survives a page reload and ends when you sign out. A banner shows while previewing.
3. **Save**, then **Activate for everyone**. Other users get it on their next page load.
4. **Use default** switches everyone back. **Export JSON** produces a `.crm-template.json` file you can import into another environment.

Saving a template that is already active updates the live look for everyone on their next page load. Every create, update, activate, deactivate and delete is written to the admin audit log: creates and deletes record the full template, updates record each changed field with its previous and next value, and activations record which template replaced which. Uploaded logos are recorded by size and hash rather than copied.

## Safe mode

If a template breaks the page, open any CRM URL with `?crm-safe-mode=1`. Custom CSS and JS are then skipped in that browser session (colours and brand still apply), so you can reach the editor and fix it. `?crm-safe-mode=0`, or the banner button, turns it off.

## Stable hooks for CSS and JS

Target these instead of Tailwind class names, which change between releases.

| Hook | Values |
|---|---|
| `body[data-crm-page]` | `login`, `dashboard`, `leads`, `lead-workbench`, `candidate-dossier`, `conversations`, `orders`, `order-detail`, `training-finance-detail`, `import`, `extract`, `admin`, `ui-text-overrides`, `ui-templates`, `region-groups`, `audit`, `other` |
| `body[data-crm-template]` | slug of the active template name, or `default` |
| `body[data-crm-safe-mode]` | present while safe mode is on |
| `[data-crm-shell]` | `frame`, `sidebar`, `brand`, `nav`, `header`, `content` |
| `[data-crm-component]` | `button`, `input`, `select`, `field`, `panel`, `section-header`, `stat-card`, `metric-card`, `info-card`, `badge`, `empty-state`, `info-strip`, `toolbar`, `data-table`, `pagination`, `description-list` |
| `[data-crm-variant]` | button: `primary`, `secondary`, `ghost`, `danger` |
| `[data-crm-tone]` | badge / metric card: `neutral`, `accent`, `success`, `warning`, `danger` |

CSS variables (values are `r g b` triplets, use them as `rgb(var(--crm-indigo-600))`):

- `--crm-<palette>-<shade>` for `slate`, `indigo`, `blue`, `emerald`, `green`, `amber`, `yellow`, `rose`, `red` × `50…950`
- `--crm-font-sans`

Colour families map onto palettes as follows: accent → indigo + blue (anchored at shade 600), neutral → slate, success → emerald + green, warning → amber + yellow, danger → rose + red (anchored at 500).

## JavaScript API

The script receives a frozen `crm` object and runs in strict mode:

```js
crm.onRouteChange(({ path, page }) => { … })   // runs now and after every navigation; returns unsubscribe
crm.observe(selector, (el) => cleanup?)        // once per matching element, including ones React renders later
crm.addStyle(css)                              // returns remove()
crm.setToken("--crm-indigo-600", "2 132 199")  // CSS variable on :root
crm.onCleanup(fn)                              // when the template is switched, previewed or disabled
crm.page(); crm.route(); crm.lang()            // "leads", "/leads", "en" | "vi"
crm.user                                       // { username, roles } — no tokens
crm.template                                   // { id, name, preview }
crm.log(...)                                   // console.info with a [crm template] prefix
```

Everything registered through the API is undone when the template stops. The script starts once per page load (token refreshes do not restart it). Errors thrown by the script or its callbacks are caught: the CRM keeps working, admins see an error banner, and the editor's Custom JS tab lists them.

Example: a welcome banner on every page, re-added after navigation.

```js
crm.observe('[data-crm-shell="content"]', (el) => {
  const banner = document.createElement("div");
  banner.className = "acme-banner";
  banner.textContent = `Welcome, ${crm.user.username}`;
  el.prepend(banner);
  return () => banner.remove();
});
```

Guidelines:

- Prefer adding classes, elements and styles. Do not rewrite text or attributes React renders, because React may overwrite them on the next render.
- Do not remove or move elements React owns.
- Asynchronous errors (inside your own `setTimeout`/`fetch` callbacks) are not caught by the runtime; wrap them yourself.

## Security model

Custom JS is admin-authored code with full access to the page, the same trust level as Elementor's custom code. It can call the CRM API as the signed-in user. Mitigations:

- only full admins can create, edit or activate templates (`@Roles(Admin)`; not delegated to `ops_manager`)
- nothing a template author writes reaches the page where passwords are typed: the login page gets only validated tokens (colours, font, brand, logo). `GET /api/ui-templates/active/public` omits both custom JS and custom CSS (a CSS attribute selector on the password field could leak what is typed), and a signed-in user opening `/login` is redirected to the dashboard
- after a template script has run, signing out (manually, idle, expired, or from another tab) revokes the refresh session and fully reloads to `/login`, so anything the script left behind outside the `crm` API (listeners, timers, patched globals) cannot observe the next login
- tokens are validated server-side (hex colours, plain font stacks, https/relative/data-image logo URLs) so they cannot inject CSS
- every change is audited with full previous/next content
- safe mode recovers from a broken template without a deploy

## Backend

- `GET /api/ui-templates/active/public`: active tokens only, no CSS or JS (unauthenticated)
- `GET /api/ui-templates/active`: active template including JS (any signed-in user)
- `GET|POST /api/admin/ui-templates`, `GET|PATCH|DELETE /api/admin/ui-templates/:id`, `POST /api/admin/ui-templates/:id/activate`, `POST /api/admin/ui-templates/deactivate` (admin)

Stored in `crm.ui_templates` (migration `CreateUiTemplates1778400000000`). A partial unique index keeps at most one row active, and activate / deactivate / delete run in a transaction under a Postgres advisory lock so concurrent admin actions cannot leave zero or two templates active.

Known limitation: two admins editing the same template at the same time overwrite each other (last save wins); there is no version check yet.

## Code map

- `tailwind.config.js`: palettes routed through `--crm-*` variables, defaults equal to Tailwind's values
- `apps/crm-admin/src/templates/`: tokens → CSS variables, page ids, script runtime, provider, import/export
- `apps/crm-admin/src/features/admin/ui-templates-page.tsx`: the editor
- `packages/ui/src/primitives.tsx`: `data-crm-*` hooks on shared components
