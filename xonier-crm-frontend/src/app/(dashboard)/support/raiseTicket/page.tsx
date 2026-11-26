import RaiseTicketForm from "@/src/components/ticket/RaiseTicket";

export default function RaiseTicketPage() {
  // Dummy auth check — replace with real auth/session logic
  const isAdmin = true;

  return (
    <div className="min-h-screen">
      <RaiseTicketForm isAdmin={isAdmin} />
    </div>
  );
}
