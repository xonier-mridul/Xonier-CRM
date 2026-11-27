import React, { RefObject } from "react";
import { Check } from "lucide-react";
import i18n from "../../i18n/index";
import { useTranslation } from "react-i18next";

interface LanguageOption {
  code: string;
  label: string;
  icon:string;
}

interface LanguageSelectorProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dropdownRef: RefObject<HTMLDivElement | null>;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  isOpen, 
  setIsOpen, 
  dropdownRef 
}) => {
  const { t } = useTranslation();

  const languages: LanguageOption[] = [
     { code: "en", icon: "🇬🇧", label: t("english") },    // or 🇺🇸 for US English
  { code: "hi", icon: "🇮🇳", label: t("hindi") },
  { code: "pt", icon: "🇵🇹", label: t("portuguese") }, 
  ];

  const handleLanguageSelect = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };


  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 z-50 w-44 origin-top-right bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-lg p-1"
    >
      <div className="space-y-0.5">
        {languages.map((lang) => {
          const active = i18n.language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageSelect(lang.code)}
              className={`w-full text-left px-2.5 py-2 text-[13px] rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                active
                  ? "bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-sm leading-none">{lang.icon}</span>
                <span>{lang.label}</span>
              </span>

              {active && (
                <Check size={14} strokeWidth={2} className="text-teal-600 dark:text-teal-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSelector;