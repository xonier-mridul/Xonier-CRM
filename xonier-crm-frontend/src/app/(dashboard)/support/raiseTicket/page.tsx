import RaiseTicketForm from "@/src/components/ticket/RaiseTicket";

export default function RaiseTicketPage() {
  // Dummy auth check — replace with real auth/session logic
  const isAdmin = true;

  return (
    <div className="min-h-screen  py-12 px-4 sm:px-6">
      <RaiseTicketForm isAdmin={isAdmin} />
    </div>
  );
}