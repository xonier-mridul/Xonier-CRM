"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import { PERMISSIONS } from "@/src/constants/enum";
import { usePermissions } from "@/src/hooks/usePermissions";
import InvoiceService from "@/src/services/invoice.service";

type InvoiceItem = { description: string; quantity: number; unitPrice: number; discount?: number; taxRate?: number };
const today = () => new Date().toISOString().slice(0, 10);
const control = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

export default function CreateStandaloneInvoice() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [status, setStatus] = useState("issued");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  const subtotal = useMemo(() => items.reduce((sum, item) => {
    let amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    amount *= 1 - (Number(item.discount) || 0) / 100;
    amount *= 1 + (Number(item.taxRate) || 0) / 100;
    return sum + amount;
  }, 0), [items]);

  const setItem = (index: number, key: keyof InvoiceItem, value: string) => setItems((old) => old.map((item, i) => i !== index ? item : {
    ...item,
    [key]: key === "description" ? value : (value === "" ? 0 : Number(value)),
  }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (items.some((item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0)) {
      setError("Enter a description, positive quantity, and valid unit price for each item."); return;
    }
    if (subtotal <= 0) { setError("Invoice total must be greater than zero."); return; }
    setSaving(true);
    try {
      const result = await InvoiceService.create({
        customerName: customerName.trim(), customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined, companyName: companyName.trim() || undefined,
        billingAddress: billingAddress.trim() || undefined, currency, issueDate, dueDate, status,
        paymentTerms: paymentTerms.trim() || undefined, notes: notes.trim() || undefined,
        lineItems: items.map((item) => {
          const base = item.quantity * item.unitPrice;
          const discounted = base * (1 - (item.discount || 0) / 100);
          return { ...item, total: Math.round(discounted * (1 + (item.taxRate || 0) / 100) * 100) / 100 };
        }),
        subTotal: Math.round(subtotal * 100) / 100, total: Math.round(subtotal * 100) / 100,
      });
      const invoice = result.data?.data;
      toast.success("Invoice created successfully");
      router.push(invoice?.id ? `/invoice/view/${invoice.id}` : "/invoice");
    } catch (err) {
      const message = axios.isAxiosError(err) ? (err.response?.data?.detail || err.response?.data?.message || "Could not create invoice") : "Could not create invoice";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
      toast.error(Array.isArray(message) ? message.join(", ") : String(message));
    } finally { setSaving(false); }
  };

  if (!hasPermission(PERMISSIONS.createInvoice) && !hasPermission(PERMISSIONS.sendInvoice)) return <div className="p-8 text-center text-gray-500">You do not have permission to create invoices.</div>;

  return <main className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900"><form onSubmit={submit} className="mx-auto max-w-5xl space-y-6">
    <header className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Invoice</h1><p className="mt-1 text-sm text-gray-500">Create a standalone invoice without linking a deal or quotation.</p></div><button type="button" onClick={() => router.push("/invoice")} className="rounded-lg border px-4 py-2 text-gray-700 dark:border-gray-600 dark:text-gray-200">Cancel</button></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="rounded-2xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Customer and invoice details</h2><div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-1 text-sm">Customer name *<input required className={control} value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></label>
      <label className="space-y-1 text-sm">Email address *<input required type="email" className={control} value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} /></label>
      <label className="space-y-1 text-sm">Phone<input type="tel" className={control} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></label>
      <label className="space-y-1 text-sm">Company name<input className={control} value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></label>
      <label className="space-y-1 text-sm md:col-span-2">Billing address<textarea rows={2} className={control} value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} /></label>
      <label className="space-y-1 text-sm">Currency<input required maxLength={3} className={control} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></label>
      <label className="space-y-1 text-sm">Status<select className={control} value={status} onChange={(e) => setStatus(e.target.value)}><option value="draft">Draft</option><option value="issued">Issued</option></select></label>
      <label className="space-y-1 text-sm">Issue date *<input required type="date" className={control} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></label>
      <label className="space-y-1 text-sm">Due date *<input required type="date" min={issueDate} className={control} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
      <label className="space-y-1 text-sm md:col-span-2">Payment terms<input className={control} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} /></label>
    </div></section>
    <section className="rounded-2xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-gray-900 dark:text-white">Items and amounts</h2><button type="button" onClick={() => setItems((old) => [...old, { description: "", quantity: 1, unitPrice: 0 }])} className="rounded-lg border border-cyan-600 px-3 py-2 text-sm text-cyan-700">Add item</button></div>
      <div className="space-y-3">{items.map((item, index) => <div key={index} className="grid gap-3 md:grid-cols-[1fr_100px_130px_110px_110px_auto]"><input required aria-label="Description" placeholder="Description" className={control} value={item.description} onChange={(e) => setItem(index, "description", e.target.value)} /><input required aria-label="Quantity" type="number" min="0.01" step="any" className={control} value={item.quantity} onChange={(e) => setItem(index, "quantity", e.target.value)} /><input required aria-label="Unit price" type="number" min="0" step="0.01" className={control} value={item.unitPrice} onChange={(e) => setItem(index, "unitPrice", e.target.value)} /><input aria-label="Discount percent" title="Discount %" type="number" min="0" max="100" step="0.01" placeholder="Disc. %" className={control} value={item.discount ?? ""} onChange={(e) => setItem(index, "discount", e.target.value)} /><input aria-label="Tax rate percent" title="Tax %" type="number" min="0" max="100" step="0.01" placeholder="Tax %" className={control} value={item.taxRate ?? ""} onChange={(e) => setItem(index, "taxRate", e.target.value)} />{items.length > 1 && <button type="button" onClick={() => setItems((old) => old.filter((_, i) => i !== index))} className="text-sm text-red-600">Remove</button>}</div>)}</div>
      <div className="mt-5 flex justify-end border-t pt-4 text-lg font-semibold text-gray-900 dark:text-white">Total: {currency} {subtotal.toFixed(2)}</div>
    </section>
    <label className="block space-y-1 text-sm">Notes<textarea rows={3} className={control} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
    <div className="flex justify-end"><button disabled={saving} className="rounded-lg bg-cyan-600 px-6 py-3 font-medium text-white hover:bg-cyan-700 disabled:opacity-50">{saving ? "Creating..." : "Create Invoice"}</button></div>
  </form></main>;
}
