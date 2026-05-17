import type {
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
  SelectHTMLAttributes
} from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Button(
  props: PropsWithChildren<{
    onClick?: () => void;
    type?: "button" | "submit";
    disabled?: boolean;
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md";
    className?: string;
  }>
) {
  const { children, variant = "primary", size = "md", className, ...rest } = props;
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "border border-indigo-600 bg-indigo-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.22)] hover:bg-indigo-500 hover:border-indigo-500",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700",
    danger: "border border-rose-500 bg-rose-500 text-white hover:bg-rose-400 hover:border-rose-400"
  };
  const sizes = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-2.5 text-sm"
  };

  return (
    <button className={cx(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label, className, ...rest } = props;
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-600">
      {label ? <span className="font-medium text-slate-600">{label}</span> : null}
      <input
        className={cx(
          "rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100",
          className
        )}
        {...rest}
      />
    </label>
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const { label, className, children, ...rest } = props;
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-600">
      {label ? <span className="font-medium text-slate-600">{label}</span> : null}
      <select
        className={cx(
          "rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100",
          className
        )}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}

export function FieldGroup(props: PropsWithChildren<{ className?: string; columns?: 1 | 2 | 3 | 4 }>) {
  const gridClass =
    props.columns === 4
      ? "md:grid-cols-2 xl:grid-cols-4"
      : props.columns === 3
        ? "md:grid-cols-2 xl:grid-cols-3"
        : props.columns === 2
          ? "md:grid-cols-2"
          : "";

  return <div className={cx("grid gap-4", gridClass, props.className)}>{props.children}</div>;
}

export function Field(props: PropsWithChildren<{ label: string; hint?: string; className?: string }>) {
  return (
    <div className={cx("flex flex-col gap-2", props.className)}>
      <div className="text-sm font-medium text-slate-600">{props.label}</div>
      {props.children}
      {props.hint ? <div className="text-xs leading-5 text-slate-500">{props.hint}</div> : null}
    </div>
  );
}

export function Panel(props: PropsWithChildren<{ title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }>) {
  const { title, subtitle, action, className, children } = props;
  return (
    <section className={cx("rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)]", className)}>
      {title || action ? (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function SectionHeader(props: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {props.eyebrow ? <div className="text-[11px] uppercase tracking-[0.26em] text-indigo-600">{props.eyebrow}</div> : null}
        <h2 className="mt-1 text-[30px] font-semibold tracking-[-0.03em] text-slate-900">{props.title}</h2>
        {props.description ? <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">{props.description}</p> : null}
      </div>
      {props.action}
    </div>
  );
}

export function StatCard(props: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{props.label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-900">{props.value}</div>
      {props.hint ? <div className="mt-2 text-sm text-slate-400">{props.hint}</div> : null}
    </div>
  );
}

export function MetricCard(props: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  className?: string;
}) {
  const accentClass =
    props.tone === "accent"
      ? "border-indigo-200 bg-indigo-50"
      : props.tone === "success"
        ? "border-emerald-200 bg-emerald-50"
        : props.tone === "warning"
          ? "border-amber-200 bg-amber-50"
          : props.tone === "danger"
            ? "border-rose-200 bg-rose-50"
            : "border-slate-200 bg-white";

  return (
    <div className={cx("rounded-[22px] border px-4 py-4 shadow-[0_14px_26px_rgba(15,23,42,0.04)]", accentClass, props.className)}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{props.value}</div>
      {props.hint ? <div className="mt-2 text-xs text-slate-500">{props.hint}</div> : null}
    </div>
  );
}

export function InfoCard(props: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-2xl border border-slate-200 bg-white px-4 py-3", props.className)}>
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-medium text-slate-800">{props.value}</div>
      {props.hint ? <div className="mt-1 text-xs leading-5 text-slate-500">{props.hint}</div> : null}
    </div>
  );
}

export function Badge(props: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "accent" }) {
  const tone = props.tone ?? "neutral";
  const tones = {
    neutral: "border border-slate-200 bg-slate-100 text-slate-700",
    success: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border border-amber-200 bg-amber-50 text-amber-700",
    danger: "border border-rose-200 bg-rose-50 text-rose-700",
    accent: "border border-indigo-200 bg-indigo-50 text-indigo-700"
  };
  return <span className={cx("inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold", tones[tone])}>{props.children}</span>;
}

export function EmptyState(props: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <h3 className="text-lg font-medium text-slate-900">{props.title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{props.description}</p>
    </div>
  );
}

export function InfoStrip(props: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cx("rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600", props.className)}>
      {props.children}
    </div>
  );
}

export function Toolbar(props: PropsWithChildren<{ className?: string; compact?: boolean }>) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        props.compact ? "px-4 py-4" : "px-5 py-5",
        props.className
      )}
    >
      {props.children}
    </div>
  );
}

export function ToolbarActions(props: PropsWithChildren<{ className?: string }>) {
  return <div className={cx("flex flex-wrap items-end gap-3", props.className)}>{props.children}</div>;
}

export function DataTable(props: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cx("overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_30px_rgba(15,23,42,0.05)]", props.className)}>
      <div className="overflow-x-auto">{props.children}</div>
    </div>
  );
}

export function PaginationFooter(props: {
  page: number;
  pageSize: number;
  total: number;
  isFetching?: boolean;
  itemLabel?: string;
  pageLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}) {
  const start = props.total === 0 ? 0 : props.page * props.pageSize + 1;
  const end = Math.min((props.page + 1) * props.pageSize, props.total);
  const hasPrevious = props.page > 0;
  const hasNext = (props.page + 1) * props.pageSize < props.total;
  const itemLabel = props.itemLabel ?? "items";
  const pageLabel = props.pageLabel ?? "Page";

  return (
    <div className={cx("flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between", props.className)}>
      <div className="text-sm text-slate-500">
        {pageLabel} {props.page + 1} · {start}-{end} / {props.total} {itemLabel}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={props.onPrevious} disabled={!hasPrevious || props.isFetching}>
          {props.previousLabel ?? "Previous"}
        </Button>
        <Button variant="secondary" size="sm" onClick={props.onNext} disabled={!hasNext || props.isFetching}>
          {props.nextLabel ?? "Next"}
        </Button>
      </div>
    </div>
  );
}

export function DescriptionList(props: { items: Array<{ label: string; value: ReactNode }>; columns?: 2 | 3 | 4; className?: string }) {
  const columns = props.columns ?? 2;
  const gridClass =
    columns === 4
      ? "md:grid-cols-2 xl:grid-cols-4"
      : columns === 3
        ? "md:grid-cols-2 xl:grid-cols-3"
        : "md:grid-cols-2";

  return (
    <div className={cx("grid gap-x-6 gap-y-4", gridClass, props.className)}>
      {props.items.map((item) => (
        <div key={item.label} className="min-w-0 border-b border-slate-100 pb-3 last:border-b-0">
          <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{item.label}</div>
          <div className="mt-2 break-words text-sm text-slate-700">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function ShellFrame(props: PropsWithChildren<{ sidebar: ReactNode; header: ReactNode }>) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[272px_minmax(0,1fr)]">
        {/*
          Sidebar stays pinned to the viewport (sticky top:0 + height:100vh on lg+)
          AND scrolls internally so a tall nav stays fully reachable on short
          viewports. The visible scrollbar is suppressed via
          `.admin-shell-sidebar-scroll` (see admin-shell.css).
        */}
        <aside className="admin-shell-sidebar-scroll border-r border-slate-800 bg-slate-950 text-slate-200 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:overflow-y-auto">
          {props.sidebar}
        </aside>
        <div className="min-w-0">
          <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur">{props.header}</div>
          <main className="p-4 md:p-6 xl:p-8">{props.children}</main>
        </div>
      </div>
    </div>
  );
}
