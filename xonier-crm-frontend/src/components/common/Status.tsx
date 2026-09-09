const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    new:            "bg-sky-50     text-sky-600     dark:bg-sky-900/20     dark:text-sky-400",
    contacted:      "bg-violet-50  text-violet-600  dark:bg-violet-900/20  dark:text-violet-400",
    qualified:      "bg-teal-50    text-teal-600    dark:bg-teal-900/20    dark:text-teal-400",
    proposal:       "bg-amber-50   text-amber-600   dark:bg-amber-900/20   dark:text-amber-400",
    won:            "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    lost:           "bg-rose-50    text-rose-500    dark:bg-rose-900/20    dark:text-rose-400",
    deleted:        "bg-slate-100  text-slate-500   dark:bg-slate-700      dark:text-slate-400",
    accepted:       "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    rejected:       "bg-rose-50    text-rose-500    dark:bg-rose-900/20    dark:text-rose-400",
    expired:        "bg-orange-50  text-orange-500  dark:bg-orange-900/20  dark:text-orange-400",
    draft:          "bg-slate-100  text-slate-500   dark:bg-slate-700      dark:text-slate-400",
    viewed:         "bg-violet-50  text-violet-600  dark:bg-violet-900/20  dark:text-violet-400",
    sent:           "bg-sky-50     text-sky-600     dark:bg-sky-900/20     dark:text-sky-400",
    connected:      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    not_connected:  "bg-rose-50    text-rose-500    dark:bg-rose-900/20    dark:text-rose-400",
    interested:     "bg-teal-50    text-teal-600    dark:bg-teal-900/20    dark:text-teal-400",
    not_interested: "bg-rose-50    text-rose-500    dark:bg-rose-900/20    dark:text-rose-400",
    not_reached:    "bg-amber-50   text-amber-600   dark:bg-amber-900/20   dark:text-amber-400",
    updated:        "bg-sky-50     text-sky-600     dark:bg-sky-900/20     dark:text-sky-400",
    resend:         "bg-violet-50  text-violet-600  dark:bg-violet-900/20  dark:text-violet-400",
  };

  const cls = map[status] ?? "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400";

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[13px] font-semibold capitalize tracking-wide ${cls}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
};

export default StatusBadge;