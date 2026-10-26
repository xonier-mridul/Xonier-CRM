export const getCompanyCurrency = () => {
  if (typeof window === "undefined") return "USD";
  return window.localStorage.getItem("companyCurrency") || "USD";
};

export const formatCurrency = (amount: number, currency = getCompanyCurrency()) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  };
