// src/components/common/SearchableSelect.tsx

"use client";

import React, { useState, useRef, useEffect } from "react";
import { IoChevronDown, IoSearch } from "react-icons/io5";

interface Option {
  value: string;
  label: string;
  flag?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  required = false,
  disabled = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col gap-2" ref={dropdownRef}>
      {label && (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 py-2.5 text-left bg-white dark:bg-gray-700 border rounded-lg flex items-center justify-between text-sm
            ${error 
              ? "border-red-500" 
              : "border-slate-200 dark:border-gray-600"
            }
            ${disabled 
              ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-gray-800" 
              : "hover:border-cyan-500 cursor-pointer"
            }
            focus:outline-none focus:ring-2 focus:ring-cyan-500/20`}
        >
          <span className={selectedOption ? "text-slate-900 dark:text-white" : "text-slate-400"}>
            {selectedOption?.flag && <span className="mr-2">{selectedOption.flag}</span>}
            {selectedOption?.label || placeholder}
          </span>
          <IoChevronDown className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-slate-200 dark:border-gray-600">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-gray-800 rounded-lg">
                <IoSearch className="text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-48">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-400 text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors
                      ${option.value === value 
                        ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400" 
                        : "text-slate-700 dark:text-slate-300"
                      }`}
                  >
                    {option.flag && <span className="mr-2">{option.flag}</span>}
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
};

export default SearchableSelect;