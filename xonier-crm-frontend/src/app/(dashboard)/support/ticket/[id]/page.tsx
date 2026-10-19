import TicketHeader from "../../header/page";
import TicketSummary from "../../summary/TicketSummary";
import TicketTimeline from "../../timeLine/TicketTimeline";
import TicketInformation from "../../ticketInformation/TicketInformation";
import TicketSupportCard from "../../supportCard/page";
import TicketUpdates from "../../ticketUpdate/page";
import TicketHistory from "../../ticketHistory/TicketHistory";
import { getPreviousTickets, getTicketById } from "@/src/constants/ticket";
import TicketNotFound from "../../notFound/TicketNotFound";

interface TicketDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailsPage({ params }: TicketDetailsPageProps) {
  const { id } = await params;

  const ticket = getTicketById(id);

  if (!ticket) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <TicketNotFound ticketId={id} />
        </div>
      </div>
    );
  }

  const previousTickets = getPreviousTickets(ticket.id);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <TicketHeader />
        <TicketSummary ticket={ticket} />
        <TicketTimeline ticket={ticket} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <TicketInformation ticket={ticket} />
          </div>
          <div className="space-y-8">
            <TicketSupportCard />
            <TicketUpdates />
          </div>
        </div>

        <TicketHistory tickets={previousTickets} />
      </div>
    </div>
  );
}
