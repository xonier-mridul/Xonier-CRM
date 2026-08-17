import { ApprovalRow, BatchRow, CommissionRow, PartnerRow, PayoutRow, ReferredClient, TierRow } from "../types/referral/referral.type";


export const commissionTiers = [
  { pct: 20, rangeLabel: "1–99" },
  { pct: 25, rangeLabel: "100–499" },
  { pct: 30, rangeLabel: "500–999" },
  { pct: 35, rangeLabel: "1000+" },
];

export const partnerDashboardMetrics = {
  activeClients: 14,
  activeClientsDelta: "+2",
  referredMrr: "$38.4k",
  referredMrrDelta: "+6.1%",
  commissionMonth: "$9,940",
  commissionMonthDelta: "+4.4%",
  lifetimeEarned: "$142.6k",
};

export const dashboardClients: ReferredClient[] = [
  {
    id: "client-a",
    name: "Client A",
    initials: "CA",
    activeUsers: 210,
    mrr: 4200,
    tierPct: 25,
    status: "active",
    statusLabel: "active",
    progressNoteKey: "",
  },
  {
    id: "client-b",
    name: "Client B",
    initials: "CB",
    activeUsers: 640,
    mrr: 11800,
    tierPct: 30,
    status: "active",
    statusLabel: "active",
    progressNoteKey: "",
  },
  {
    id: "client-c",
    name: "Client C",
    initials: "CC",
    activeUsers: 60,
    mrr: 900,
    tierPct: 20,
    status: "trial",
    statusLabel: "trial",
    progressNoteKey: "",
  },
];

export const myClients: ReferredClient[] = [
  {
    id: "client-a",
    name: "Client A",
    initials: "CA",
    activeUsers: 210,
    mrr: 4200,
    tierPct: 25,
    status: "active",
    statusLabel: "active",
    progressNoteKey: "partner.clients.note.clientA",
    progressNoteVars: { count: 210 },
  },
  {
    id: "client-b",
    name: "Client B",
    initials: "CB",
    activeUsers: 640,
    mrr: 11800,
    tierPct: 30,
    status: "active",
    statusLabel: "active",
    progressNoteKey: "partner.clients.note.clientB",
    progressNoteVars: { count: 640 },
  },
  {
    id: "client-c",
    name: "Client C",
    initials: "CC",
    activeUsers: 60,
    mrr: 900,
    tierPct: 20,
    status: "trial",
    statusLabel: "trial",
    progressNoteKey: "partner.clients.note.clientC",
    progressNoteVars: { count: 60 },
  },
  {
    id: "client-d",
    name: "Client D",
    initials: "CD",
    activeUsers: null,
    mrr: 0,
    tierPct: null,
    status: "churned",
    statusLabel: "churned",
    progressNoteKey: "partner.clients.note.clientD",
  },
];

export const commissionRows: CommissionRow[] = [
  { period: "2026-08", client: "Client B", revenue: 11800, tierPct: 30, commission: 3540, status: "accrued" },
  { period: "2026-08", client: "Client A", revenue: 4200, tierPct: 25, commission: 1050, status: "accrued" },
  { period: "2026-08", client: "Client C", revenue: 900, tierPct: 20, commission: 180, status: "accrued" },
  { period: "2026-07", client: "Client B", revenue: 10900, tierPct: 30, commission: 3270, status: "paid" },
  { period: "2026-07", client: "Client A", revenue: 3950, tierPct: 25, commission: 987.5, status: "paid" },
];

export const forecastMetrics = {
  oneYear: "$42.6k",
  fiveYear: "$268k",
  tenYear: "$611k",
  twentyYear: "$1.4M",
};

export const payoutRows: PayoutRow[] = [
  { period: "2026-08", amount: 4770, reference: "—", status: "pending" },
  { period: "2026-07", amount: 4320, reference: "UTR-88213", status: "paid" },
  { period: "2026-06", amount: 3910, reference: "UTR-87004", status: "paid" },
  { period: "2026-05", amount: 3640, reference: "UTR-85761", status: "paid" },
];

export const adminOverviewMetrics = {
  activePartners: 37,
  referredClients: 212,
  mrrUnderReferral: "$412k",
  accruedLiability: "$98.4k",
};

export const pendingApproval = {
  count: 18,
  total: "$12,940",
};

export const partnerRows: PartnerRow[] = [
  { initials: "JG", name: "Jeevant Global Solutions", clients: 4, referredMrr: "$17.9k", agreement: "2031-06", status: "active" },
  { initials: "RP", name: "Rashi Partners", clients: 6, referredMrr: "$22.4k", agreement: "2028-03", status: "active" },
  { initials: "NC", name: "NorthCore Consulting", clients: 2, referredMrr: "$5.1k", agreement: "2027-11", status: "trial" },
  { initials: "VS", name: "Vertex Systems", clients: 0, referredMrr: "$0", agreement: "2026-09", status: "churned" },
];

export const tierRows: TierRow[] = [
  { minUsers: "1", maxUsers: "99", commissionPct: "20", effectiveFrom: "2026-01-01" },
  { minUsers: "100", maxUsers: "499", commissionPct: "25", effectiveFrom: "2026-01-01" },
  { minUsers: "500", maxUsers: "999", commissionPct: "30", effectiveFrom: "2026-01-01" },
  { minUsers: "1000", maxUsers: "∞", commissionPct: "35", effectiveFrom: "2026-01-01" },
];

export const approvalRows: ApprovalRow[] = [
  { partner: "Jeevant Global", client: "Client B", revenue: "$11,800", commission: "$3,540", tierPct: "30%" },
  { partner: "Jeevant Global", client: "Client A", revenue: "$4,200", commission: "$1,050", tierPct: "25%" },
  { partner: "Rashi Partners", client: "Client D", revenue: "$2,100", commission: "$420", tierPct: "20%" },
  { partner: "Rashi Partners", client: "Client E", revenue: "$18,600", commission: "$6,510", tierPct: "35%" },
];

export const batchRows: BatchRow[] = [
  { batch: "B-0142", period: "2026-08", total: "$12,940", status: "pending" },
  { batch: "B-0141", period: "2026-07", total: "$11,760", status: "paid" },
  { batch: "B-0140", period: "2026-06", total: "$10,980", status: "paid" },
];

export const dashForecastChart = {
  labels: ["Now", "1y", "2y", "3y", "4y", "5y"],
  data: [9940, 42600, 86000, 140000, 200000, 268000],
};

export const fullForecastChart = {
  labels: ["Now", "1y", "5y", "10y", "15y", "20y"],
  expected: [9940, 42600, 268000, 611000, 950000, 1400000],
  conservative: [9940, 35000, 180000, 380000, 560000, 780000],
};

export const liabilityChart = {
  labels: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"],
  paid: [41000, 44000, 47000, 50000, 53000, 0],
  accrued: [3000, 3400, 3900, 4200, 4600, 98400],
};
