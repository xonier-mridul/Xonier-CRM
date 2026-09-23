 export const POWER_LEVELS = [
  { value: 10, label: "viewer", color: "bg-slate-400" },
  { value: 30, label: "member", color: "bg-blue-400" },
  { value: 50, label: "manager", color: "bg-emerald-500" },
  { value: 70, label: "project_manager", color: "bg-amber-500" },
  { value: 90, label: "admin_2", color: "bg-rose-500" },
  { value: 100, label: "owner", color: "bg-purple-600" },
];

export function getPowerConfig(power: number) {
  const match = [...POWER_LEVELS].reverse().find((p) => power >= p.value);
  return match ?? POWER_LEVELS[0];
}