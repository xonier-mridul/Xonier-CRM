import {
  Ticket,
  PreviousTicket,
  TicketStatus,
  TimelineEvent,
} from "@/src/types/ticket/ticket.type";

/* ---------------------------------- */
/* Timeline Generator (DRY helper)     */
/* ---------------------------------- */

const statusOrder: TicketStatus[] = [
  "OPEN",
  "UNDER_REVIEW",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "RESOLVED",
];

const timelineMeta: Record<TicketStatus, { title: string; description: string }> = {
  OPEN: { title: "timeline_raised", description: "desc_raised" },
  UNDER_REVIEW: { title: "timeline_under_review", description: "desc_under_review" },
  IN_PROGRESS: { title: "timeline_in_progress", description: "desc_in_progress" },
  WAITING_FOR_USER: { title: "timeline_waiting", description: "desc_waiting" },
  RESOLVED: { title: "timeline_resolved", description: "desc_resolved" },
};

function buildHistory(currentStatus: TicketStatus, activeDate: string): TimelineEvent[] {
  const currentIndex = statusOrder.indexOf(currentStatus);

  return statusOrder.map((status, index) => ({
    id: `h-${status}`,
    title: timelineMeta[status].title,
    description: timelineMeta[status].description,
    date: index <= currentIndex ? activeDate : "—",
    status,
    completed: index < currentIndex,
    active: index === currentIndex,
  }));
}

/* ---------------------------------- */
/* Master Ticket Dataset               */
/* ---------------------------------- */

export const allTickets: Ticket[] = [
  {
    id: "TRK-10234",
    subject: "Unable to sync contacts from Google Workspace integration",
    description:
      "When attempting to sync contacts from our connected Google Workspace account, the sync process fails after loading roughly 20% of records. Error code SYNC_408 appears and no further details are available in the logs. This is impacting our sales team's ability to reach new leads.",
    issueType: "Integration Issue",
    product: "Trakeroo CRM",
    module: "Contacts & Sync",
    status: "IN_PROGRESS",
    priority: "HIGH",
    raisedBy: "Aditi Sharma",
    department: "Sales Operations",
    createdAt: "12 Mar 2025, 10:24 AM",
    updatedAt: "14 Mar 2025, 3:30 PM",
    estimatedResponse: "2 Hours",
    attachments: [
      { id: "a1", name: "sync-error-log.pdf", size: "1.2 MB", url: "#" },
      { id: "a2", name: "screenshot-error.pdf", size: "842 KB", url: "#" },
    ],
    history: buildHistory("IN_PROGRESS", "14 Mar 2025, 3:30 PM"),
  },
  {
    id: "TRK-10198",
    subject: "Email templates not rendering images correctly",
    description:
      "Images embedded in outgoing email templates appear broken for recipients using Outlook. The image src URLs seem to be stripped during the send process, resulting in blank placeholders.",
    issueType: "Bug",
    product: "Trakeroo Mail",
    module: "Email Templates",
    status: "RESOLVED",
    priority: "MEDIUM",
    raisedBy: "Rohan Mehta",
    department: "Marketing",
    createdAt: "28 Feb 2025, 9:10 AM",
    updatedAt: "02 Mar 2025, 4:00 PM",
    estimatedResponse: "4 Hours",
    attachments: [{ id: "a1", name: "broken-template.pdf", size: "540 KB", url: "#" }],
    history: buildHistory("RESOLVED", "02 Mar 2025, 4:00 PM"),
  },
  {
    id: "TRK-10176",
    subject: "Unable to export leads report to CSV",
    description:
      "The CSV export option on the Leads Report page returns an empty file with only headers, no matter the filters applied. This worked correctly until the last release.",
    issueType: "Bug",
    product: "Trakeroo Analytics",
    module: "Reports",
    status: "RESOLVED",
    priority: "LOW",
    raisedBy: "Karan Malhotra",
    department: "Sales Operations",
    createdAt: "18 Feb 2025, 1:45 PM",
    updatedAt: "22 Feb 2025, 11:20 AM",
    estimatedResponse: "6 Hours",
    attachments: [],
    history: buildHistory("RESOLVED", "22 Feb 2025, 11:20 AM"),
  },
  {
    id: "TRK-10143",
    subject: "Dashboard widgets loading slowly on Safari",
    description:
      "Users on Safari (macOS and iOS) report that dashboard widgets take upwards of 10 seconds to render, while Chrome and Firefox load instantly. Possibly related to a rendering library incompatibility.",
    issueType: "Performance",
    product: "Trakeroo CRM",
    module: "Dashboard",
    status: "WAITING_FOR_USER",
    priority: "MEDIUM",
    raisedBy: "Simran Kaur",
    department: "Customer Success",
    createdAt: "10 Feb 2025, 10:00 AM",
    updatedAt: "15 Feb 2025, 2:15 PM",
    estimatedResponse: "3 Hours",
    attachments: [{ id: "a1", name: "safari-console-log.pdf", size: "980 KB", url: "#" }],
    history: buildHistory("WAITING_FOR_USER", "15 Feb 2025, 2:15 PM"),
  },
  {
    id: "TRK-10121",
    subject: "Duplicate contact records after bulk import",
    description:
      "After importing a CSV of 2,000 contacts, roughly 15% appear as duplicates despite matching emails already existing in the system. Deduplication settings were enabled during import.",
    issueType: "Bug",
    product: "Trakeroo CRM",
    module: "Contacts & Sync",
    status: "UNDER_REVIEW",
    priority: "HIGH",
    raisedBy: "Aditi Sharma",
    department: "Sales Operations",
    createdAt: "05 Feb 2025, 3:30 PM",
    updatedAt: "07 Feb 2025, 9:45 AM",
    estimatedResponse: "5 Hours",
    attachments: [{ id: "a1", name: "import-sample.pdf", size: "1.5 MB", url: "#" }],
    history: buildHistory("UNDER_REVIEW", "07 Feb 2025, 9:45 AM"),
  },
  {
    id: "TRK-10098",
    subject: "API webhook not firing on deal stage change",
    description:
      "Our configured webhook endpoint is not receiving payloads when a deal moves between pipeline stages, even though the webhook shows as 'Active' in settings. No errors are logged on our end.",
    issueType: "Integration Issue",
    product: "Trakeroo CRM",
    module: "Settings",
    status: "OPEN",
    priority: "HIGH",
    raisedBy: "Devansh Rao",
    department: "Engineering",
    createdAt: "30 Jan 2025, 11:00 AM",
    updatedAt: "30 Jan 2025, 11:00 AM",
    estimatedResponse: "2 Hours",
    attachments: [],
    history: buildHistory("OPEN", "30 Jan 2025, 11:00 AM"),
  },
  {
    id: "TRK-10076",
    subject: "Unable to change workspace timezone settings",
    description:
      "The timezone dropdown in Workspace Settings resets to UTC immediately after saving, regardless of the selection made. This is causing scheduled reports to run at incorrect times.",
    issueType: "Bug",
    product: "Trakeroo CRM",
    module: "Settings",
    status: "RESOLVED",
    priority: "LOW",
    raisedBy: "Neha Verma",
    department: "IT Admin",
    createdAt: "22 Jan 2025, 8:30 AM",
    updatedAt: "25 Jan 2025, 5:00 PM",
    estimatedResponse: "4 Hours",
    attachments: [],
    history: buildHistory("RESOLVED", "25 Jan 2025, 5:00 PM"),
  },
  {
    id: "TRK-10054",
    subject: "Custom fields missing after CRM migration",
    description:
      "Following the migration from our legacy CRM, 6 custom fields on the Contact object are no longer visible in the UI, although the data appears intact when queried via API.",
    issueType: "Data Issue",
    product: "Trakeroo CRM",
    module: "Contacts & Sync",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    raisedBy: "Priya Nair",
    department: "Customer Success",
    createdAt: "15 Jan 2025, 2:00 PM",
    updatedAt: "18 Jan 2025, 10:30 AM",
    estimatedResponse: "3 Hours",
    attachments: [{ id: "a1", name: "migration-report.pdf", size: "2.1 MB", url: "#" }],
    history: buildHistory("IN_PROGRESS", "18 Jan 2025, 10:30 AM"),
  },
];

/* ---------------------------------- */
/* Accessor Helpers                    */
/* ---------------------------------- */

export function getTicketById(id: string): Ticket | undefined {
  return allTickets.find((ticket) => ticket.id.toLowerCase() === id.toLowerCase());
}

export function getPreviousTickets(excludeId: string, limit = 5): PreviousTicket[] {
  return allTickets
    .filter((ticket) => ticket.id.toLowerCase() !== excludeId.toLowerCase())
    .slice(0, limit)
    .map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      updatedAt: ticket.updatedAt,
    }));
}