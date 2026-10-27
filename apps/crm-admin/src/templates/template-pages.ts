/**
 * Stable page ids exposed to templates as `<body data-crm-page="…">` and
 * `crm.page()`. Templates target these instead of URLs so a route rename does
 * not silently break customer CSS/JS. Keep ids stable once published.
 */
const PAGE_RULES: Array<[RegExp, string]> = [
  [/^\/login\/?$/, "login"],
  [/^\/dashboard\/?$/, "dashboard"],
  [/^\/leads\/?$/, "leads"],
  [/^\/leads\/[^/]+\/dossier\/?$/, "candidate-dossier"],
  [/^\/leads\/[^/]+\/?$/, "lead-workbench"],
  [/^\/conversations\/?$/, "conversations"],
  [/^\/orders\/?$/, "orders"],
  [/^\/orders\/[^/]+\/?$/, "order-detail"],
  [/^\/training-finance\/[^/]+\/?$/, "training-finance-detail"],
  [/^\/import\/?$/, "import"],
  [/^\/extract\/?$/, "extract"],
  [/^\/admin\/?$/, "admin"],
  [/^\/ui-text-overrides\/?$/, "ui-text-overrides"],
  [/^\/ui-templates\/?$/, "ui-templates"],
  [/^\/region-groups\/?$/, "region-groups"],
  [/^\/audit\/?$/, "audit"]
];

export const TEMPLATE_PAGE_IDS = PAGE_RULES.map(([, id]) => id);

export function pageIdForPath(pathname: string): string {
  for (const [pattern, id] of PAGE_RULES) {
    if (pattern.test(pathname)) return id;
  }
  return "other";
}
