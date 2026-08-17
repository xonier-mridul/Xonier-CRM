import { NUMBER_OF_EMPLOYEES } from "../types/companySetting/company.types";
import { COUNTRY_CODE } from "./enum";


export const COMPANY_SIZE_OPTIONS = [
  { value: NUMBER_OF_EMPLOYEES.EMPLOYEES_1_10, label: "1-10 employees" },
  { value: NUMBER_OF_EMPLOYEES.EMPLOYEES_11_50, label: "11-50 employees" },
  { value: NUMBER_OF_EMPLOYEES.EMPLOYEES_51_200, label: "51-200 employees" },
  { value: NUMBER_OF_EMPLOYEES.EMPLOYEES_201_500, label: "201-500 employees" },
  { value: NUMBER_OF_EMPLOYEES.EMPLOYEES_501_1000, label: "501-1000 employees" },
  { value: NUMBER_OF_EMPLOYEES.EMPLOYEES_1000_PLUS, label: "1000+ employees" },
];


export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "(GMT-5:00) Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "(GMT-6:00) Central Time (US & Canada)" },
  { value: "America/Denver", label: "(GMT-7:00) Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "(GMT-8:00) Pacific Time (US & Canada)" },
  { value: "Europe/London", label: "(GMT+0:00) London" },
  { value: "Europe/Paris", label: "(GMT+1:00) Paris, Berlin, Rome" },
  { value: "Europe/Athens", label: "(GMT+2:00) Athens, Istanbul" },
  { value: "Asia/Dubai", label: "(GMT+4:00) Abu Dhabi, Dubai" },
  { value: "Asia/Kolkata", label: "(GMT+5:30) Mumbai, Kolkata, New Delhi" },
  { value: "Asia/Singapore", label: "(GMT+8:00) Singapore, Hong Kong" },
  { value: "Asia/Tokyo", label: "(GMT+9:00) Tokyo, Seoul" },
  { value: "Australia/Sydney", label: "(GMT+10:00) Sydney, Melbourne" },
];

export const COUNTRY_OPTIONS = [
  { value: COUNTRY_CODE.US, label: "United States", flag: "🇺🇸" },
  { value: COUNTRY_CODE.GB, label: "United Kingdom", flag: "🇬🇧" },
  { value: COUNTRY_CODE.IN, label: "India", flag: "🇮🇳" },
  { value: COUNTRY_CODE.CA, label: "Canada", flag: "🇨🇦" },
  { value: COUNTRY_CODE.AU, label: "Australia", flag: "🇦🇺" },
  { value: COUNTRY_CODE.DE, label: "Germany", flag: "🇩🇪" },
  { value: COUNTRY_CODE.FR, label: "France", flag: "🇫🇷" },
  { value: COUNTRY_CODE.AE, label: "United Arab Emirates", flag: "🇦🇪" },
];