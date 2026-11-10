"use client";

import { createContext, useContext, useEffect, useState } from "react";
import CompanyService from "@/src/services/company.service";
import { getCompanyCurrency, setCompanyCurrency } from "@/src/app/utils/currency.utils";

const CurrencyContext = createContext("USD");

export function CompanyCurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState("USD");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const sync = () => setCurrency(getCompanyCurrency());
    window.addEventListener("company-currency-changed", sync);
    CompanyService.getCompanyDetails()
      .then((company) => {
        if (active) setCompanyCurrency(company.currency || "USD");
      })
      .catch(() => undefined)
      .finally(() => { if (active) setReady(true); });
    return () => {
      active = false;
      window.removeEventListener("company-currency-changed", sync);
    };
  }, []);

  return <CurrencyContext.Provider value={currency}>
    {ready ? children : <div className="min-h-screen flex items-center justify-center text-slate-500">Loading organization settings…</div>}
  </CurrencyContext.Provider>;
}

export const useCompanyCurrency = () => useContext(CurrencyContext);
