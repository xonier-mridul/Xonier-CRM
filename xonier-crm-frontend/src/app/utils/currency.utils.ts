export const getCompanyCurrency = () => {
  if (typeof window === "undefined") return "USD";
  return window.localStorage.getItem("companyCurrency") || "USD";
};

export const setCompanyCurrency = (currency: string) => {
  if (typeof window === "undefined" || !currency) return;
  window.localStorage.setItem("companyCurrency", currency);
  window.dispatchEvent(new Event("company-currency-changed"));
};

export const getCurrencySymbol = (currency: string) => {
  try {
    const symbol = new Intl.NumberFormat("en-US", { style: "currency", currency })
      .formatToParts(0).find((part) => part.type === "currency")?.value || currency;
    return /^[A-Z]{3}$/.test(symbol) ? `${symbol} ` : symbol;
  } catch {
    return `${currency} `;
  }
};

export const currencyLabel = (label: string, key: string, currency: string) =>
  key.toLowerCase() === "amount" || /\bamount\s*\(\$\)/i.test(label)
    ? label.replace(/\s*\((?:\$|[A-Z]{3})\)\s*$/i, "") + ` (${currency})`
    : label;

export const formatCurrency = (amount: number, currency = getCompanyCurrency()) => {
    return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  };
