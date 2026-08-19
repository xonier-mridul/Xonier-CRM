export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[13px]">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

export function Th({ children, num = false }: { children?: React.ReactNode; num?: boolean }) {
  return (
    <th
      className={`border-b border-slate-300 px-2.5 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-text-3 ${
        num ? "font-mono" : ""
      }`}
    >
      {children}
    </th>
  );
}

export function Tr({ children, onClick, highlight = false }: { children: React.ReactNode; onClick?: () => void; highlight?: boolean }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-line border-slate-200 last:border-b-0 hover:bg-paper ${onClick ? "cursor-pointer" : ""} ${
        highlight ? "bg-cyan-100" : ""
      }`}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  num = false,
  className = "",
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  num?: boolean;
}) {
  return (
    <td
      {...props}
      className={`px-2.5 py-2.5 text-text-1 ${
        num ? "font-mono" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}
