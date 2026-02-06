import { handleCopy } from "@/src/app/utils/clipboard.utils";
import SensitiveField from "../common/SensitiveField";
import { maskEmail, maskPhone } from "@/src/app/utils/mask.utils";

export const Field = ({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2 group">
    <span className="text-xs uppercase tracking-wide text-gray-400 group-hover:text-blue-300">
      {label}
    </span>
    <span className="text-[13px] tracking-wide font-medium text-gray-900 dark:text-gray-100 cursor-copy group-hover:bg-slate-500 rounded-lg px-3 py-1" onClick={()=>handleCopy(String(value) )}>
      {value ?? "—"}
    </span>
  </div>
);

export const MaskEmailField = ({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) => {
  
  const email = maskEmail(String(value))
  return <div className="flex flex-col gap-2 group">
    <span className="text-xs uppercase tracking-wide text-gray-400 group-hover:text-blue-300">
      {label}
    </span>
    <span className="text-[13px] tracking-wide font-medium text-gray-900 dark:text-gray-100 cursor-copy group-hover:dark:bg-slate-500 rounded-lg px-3 py-1">
      <SensitiveField value={String(value)} maskedValue={email} link={`mailto:${String(value)}`}/>
    </span>
  </div>
};
export const MaskPhoneField = ({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) => {
  
  const email = maskPhone(String(value))
  return <div className="flex flex-col gap-2 group">
    <span className="text-xs uppercase tracking-wide text-gray-400 group-hover:text-blue-300">
      {label}
    </span>
    <span className="text-[13px] tracking-wide font-medium text-gray-900 dark:text-gray-100 cursor-copy group-hover:dark:bg-slate-500 rounded-lg px-3 py-1">
      <SensitiveField value={String(value)} maskedValue={email} link={`tel:${String(value)}`}/>
    </span>
  </div>
};


export const Badge = ({
  value,
  type = "default",
}: {
  value?: string;
  type?: "status" | "priority" | "default";
}) => {
  if (!value) return <span className="text-gray-400">—</span>;

  const base =
    "px-4 py-1.5 rounded-full text-sm font-semibold capitalize";

  const variants: Record<string, string> = {
    status: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
    priority:
      value === "high"
        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
        : value === "medium"
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
        : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
    default:
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  };

  return <span className={`${base} ${variants[type]}`}>{value.replaceAll("_", " ")}</span>;
};


export const LeadSkeleton = () => (
  <div className="grid grid-cols-2 gap-6">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="h-12 bg-gray-200 dark:bg-gray-600 rounded-md animate-pulse" />
    ))}
  </div>
);

export const InfoCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700  p-5">
    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">
      {title}
    </h3>
    {children}
  </div>
);

