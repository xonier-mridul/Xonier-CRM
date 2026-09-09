import { TASK_PRIORITY } from "../types/task/task.types";
import { CURRENCY, NUMBER_OF_EMPLOYEES } from "./enum";

export const SIDEBAR_WIDTH = "288px"
export const MARGIN_TOP = "40px"
export const SUPER_ADMIN_ROLE_CODE:string = "SUPER_ADMIN"
export const STOP_DISPLAY_MS = 4000;

export const PRIORITY_STYLE: Record<
  TASK_PRIORITY,
  { cls: string; dot: string; label: string }
> = {
  [TASK_PRIORITY.LOW]: {
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    dot: "bg-slate-400",
    label: "Low",
  },
  [TASK_PRIORITY.MEDIUM]: {
    cls: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-400",
    label: "Medium",
  },
  [TASK_PRIORITY.HIGH]: {
    cls: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    dot: "bg-orange-500",
    label: "High",
  },
  [TASK_PRIORITY.URGENT]: {
    cls: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    dot: "bg-rose-500",
    label: "Urgent",
  },
};



export const CURRENCY_SYMBOL: Record<CURRENCY, string> = {
  [CURRENCY.USD]: "$",
  [CURRENCY.EUR]: "€",
  [CURRENCY.GBP]: "£",
  [CURRENCY.INR]: "₹",
  [CURRENCY.AUD]: "A$",
  [CURRENCY.CAD]: "C$",
  [CURRENCY.CHF]: "Fr",
  [CURRENCY.CNY]: "¥",
  [CURRENCY.JPY]: "¥",
  [CURRENCY.SGD]: "S$",
  [CURRENCY.HKD]: "HK$",
  [CURRENCY.NZD]: "NZ$",
  [CURRENCY.SEK]: "kr",
  [CURRENCY.NOK]: "kr",
  [CURRENCY.DKK]: "kr",
  [CURRENCY.ZAR]: "R",
  [CURRENCY.AED]: "د.إ",
  [CURRENCY.SAR]: "﷼",
  [CURRENCY.BRL]: "R$",
  [CURRENCY.MXN]: "MX$",
  [CURRENCY.RUB]: "₽",
  [CURRENCY.KRW]: "₩",
};


export const sizeOptions = [
  { label: "< 50 employees", value: NUMBER_OF_EMPLOYEES.LESS_THAN_50 },
  { label: "50 – 100", value: NUMBER_OF_EMPLOYEES.FROM_50_TO_100 },
  { label: "100 – 200", value: NUMBER_OF_EMPLOYEES.FROM_100_TO_200 },
  { label: "200 – 300", value: NUMBER_OF_EMPLOYEES.FROM_200_TO_300 },
  { label: "300 – 400", value: NUMBER_OF_EMPLOYEES.FROM_300_TO_400 },
  { label: "400 – 500", value: NUMBER_OF_EMPLOYEES.FROM_400_TO_500 },
  { label: "500 – 1000", value: NUMBER_OF_EMPLOYEES.FROM_500_TO_1000 },
  { label: "1000 – 2000", value: NUMBER_OF_EMPLOYEES.FROM_1000_TO_2000 },
  { label: "2000 – 5000", value: NUMBER_OF_EMPLOYEES.FROM_2000_TO_5000 },
];