export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-5 rounded-2xl border border-slate-200 bg- bg-white/60 p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-[15px] font-semibold uppercase tracking-wider text-teal-deep">{children}</p>;
}

export function MetricCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  delta?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-slate-200 bg-white/70 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="text-[11.5px] text-text-2">{label}</div>

        {icon && (
          <div className="text-text-2">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-1.5 font-display text-2xl text-ink">
        {value}
      </div>

      {delta && (
        <div className="mt-1 font-mono text-[11px] text-teal-deep">
          {delta}
        </div>
      )}
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
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?:boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-1.5 py-1 text-[12.5px] cursor-pointer font-medium ${danger ? "text-coral" : "text-teal-deep"}`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, onClick,disabled }: { children: React.ReactNode; onClick?: () => void,disabled?:boolean}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-slate-300 bg-white/60 px-3.5 py-2 text-[12.5px] text-slate-600 hover:bg-cyan-500 hover:text-white"
    >
      {children}
    </button>
  );
}

export function Button({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-slate-300 bg-paper-2 px-3.5 py-2 text-[12.5px] text-ink"
    >
      {children}
    </button>
  );
}
