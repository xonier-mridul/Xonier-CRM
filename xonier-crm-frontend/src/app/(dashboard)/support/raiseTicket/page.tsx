import RaiseTicketForm from "@/src/components/ticket/RaiseTicket";

export default function RaiseTicketPage() {
  // Dummy auth check — replace with real auth/session logic
  const isAdmin = true;

  return (
    <div className="min-h-screen ml-72  py-12 px-4 sm:px-6">
      <RaiseTicketForm isAdmin={isAdmin} />
    </div>
  );
}