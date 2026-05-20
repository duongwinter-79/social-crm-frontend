export function RefreshButton(props: {
  label: string;
  refreshingLabel: string;
  isRefreshing?: boolean;
  onRefresh: () => void;
}) {
  const title = props.isRefreshing ? props.refreshingLabel : props.label;

  return (
    <button
      type="button"
      onClick={props.onRefresh}
      disabled={props.isRefreshing}
      title={title}
      aria-label={title}
      className="group inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-wait disabled:opacity-70"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`h-4 w-4 ${props.isRefreshing ? "animate-spin" : "transition-transform group-hover:rotate-45"}`}
      >
        <path
          d="M20 12a8 8 0 1 1-2.34-5.66"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M20 4v5h-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </button>
  );
}
