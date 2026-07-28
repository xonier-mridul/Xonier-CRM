import React, { RefObject } from "react";
import { FiChevronDown } from "react-icons/fi";
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
      className="absolute right-0 top-12 z-50 w-48 origin-top-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="py-1">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageSelect(lang.code)}
            className={`
              w-full text-left px-4 py-2.5 text-sm transition-colors
              hover:bg-slate-100 dark:hover:bg-slate-700
              flex items-center justify-between
              ${
                i18n.language === lang.code
                  ? "bg-cyan-50 dark:bg-cyan-900/20 font-semibold text-cyan-600 dark:text-cyan-400"
                  : "text-slate-700 dark:text-slate-300"
              }
            `}
          >
            <div className="flex gap-4 items-center "> 
     <span>{lang.icon}</span>
            <span>{lang.label}</span>
            </div>
       
            {i18n.language === lang.code && (
              <svg
                className="w-4 h-4 text-cyan-600 dark:text-cyan-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;