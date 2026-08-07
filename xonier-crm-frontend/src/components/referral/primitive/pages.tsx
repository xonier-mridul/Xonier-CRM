export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-5 rounded-2xl border border-line bg-paper-2 p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-teal-deep">{children}</p>;
}

export function MetricCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-paper-2 px-4 py-4">
      <div className="text-[11.5px] text-text-2">{label}</div>
      <div className="mt-1.5 font-display text-2xl text-ink">{value}</div>
      {delta && <div className="mt-1 font-mono text-[11px] text-teal-deep">{delta}</div>}
    </div>
  );
}

export function MetricsGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">{children}</div>;
}

export function RowBetween({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-4">{children}</div>;
}

export function Footnote({ children }: { children: React.ReactNode }) {
  return <p className="mt-2.5 text-[11.5px] leading-relaxed text-text-3">{children}</p>;
}

export function GhostButton({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-1.5 py-1 text-[12.5px] font-medium ${danger ? "text-coral" : "text-teal-deep"}`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-teal bg-teal px-3.5 py-2 text-[12.5px] text-white"
    >
      {children}
    </button>
  );
}

export function Button({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-line bg-paper-2 px-3.5 py-2 text-[12.5px] text-ink"
    >
      {children}
    </button>
  );
}
