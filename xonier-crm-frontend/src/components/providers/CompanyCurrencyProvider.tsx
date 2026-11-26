"use client";

import { createContext, useContext, useEffect, useState } from "react";
import CompanyService from "@/src/services/company.service";
import { getCompanyCurrency, setCompanyCurrency } from "@/src/app/utils/currency.utils";

const CurrencyContext = createContext("USD");

export function CompanyCurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    let active = true;
    const sync = () => setCurrency(getCompanyCurrency());
    sync();
    window.addEventListener("company-currency-changed", sync);
    CompanyService.getCompanyDetails()
      .then((company) => {
        if (active) setCompanyCurrency(company.currency || "USD");
      })
      .catch(() => undefined);
    return () => {
      active = false;
      window.removeEventListener("company-currency-changed", sync);
    };
  }, []);

  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}

export const useCompanyCurrency = () => useContext(CurrencyContext);
