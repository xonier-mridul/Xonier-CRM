import { BadgeTone } from "@/src/types/referral/referral.type";


const toneClasses: Record<BadgeTone, string> = {
  active: "bg-teal-tint text-teal-deep",
  trial: "bg-amber-tint text-amber",
  paid: "bg-teal-tint text-teal-deep",
  accrued: "bg-amber-tint text-amber",
  pending: "bg-[#EDEBE0] text-text-2",
  churned: "bg-coral-tint text-coral",

  approved: "bg-teal-tint text-teal-deep",
  won: "bg-teal-tint text-teal-deep",
  lost: "bg-coral-tint text-coral",
  disputed: "bg-amber-tint text-amber",
  terminated :"bg-amber-tint text-amber",

  suspended:"bg-amber-tint text-amber",
  failed:"bg-red-tint text-red",
  requested:"bg-yellow-tint text-yellow",
  processing:"bg-yellow-tint text-yellow"
};

export default function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
