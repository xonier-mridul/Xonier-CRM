"use client";

import React, { JSX, useState, useRef, useEffect } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import { IoIosSearch, IoIosInformationCircleOutline } from "react-icons/io";
import { MdFilterAlt } from "react-icons/md";
import CompanyPeopleToggle from "@/src/components/ui/CompanyPeopleToggle"
import {
    FilterConfig,
    FilterSection,
    FilterSubSection,
    FilterField,
    FilterValues,
    FilterValue,
    CompanyPeopleToggleType
} from "@/src/types/prospect/filterSideBar.types";
import filterOptions from "./filterOption";

// ─── Props (your original shape) ─────────────────────────────────────────────

type Props = {
    open: boolean;
    onClose: () => void;
    onApply?: (filters: FilterValues) => void;
    onReset?: () => void;
    onFilterChange?: (filters: FilterValues) => void;
    onInfoTypeChange?: (type: "company" | "people")=>void;
    infoValue: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildDefaultValues = (config: FilterConfig): FilterValues => {
    const values: FilterValues = {};
    const processFields = (fields: FilterField[]) => {
        fields.forEach((field) => {
            if (field.type === "text" || field.type === "select") values[field.key] = "";
            else if (field.type === "multi_select") values[field.key] = [];
            else if (field.type === "checkbox_group") values[field.key] = [];
            else if (field.type === "range_slider" && field.sliderConfig) values[field.key] = { min: field.sliderConfig.min, max: field.sliderConfig.max };
            else if (field.type === "date_range") values[field.key] = { from: "", to: "" };
        });
    };
    config.sections.forEach((section) => {
        processFields(section.fields);
        section.subSections?.forEach((sub) => processFields(sub.fields));
    });
    return values;
};

const countActiveFilters = (values: FilterValues): number => {
    let count = 0;
    Object.values(values).forEach((v) => {
        if (Array.isArray(v) && v.length > 0) count++;
        else if (typeof v === "string" && v !== "") count++;
        else if (v && typeof v === "object" && "from" in v && (v.from || v.to)) count++;
    });
    return count;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const InfoTooltip = ({ text }: { text: string }): JSX.Element => (
    <span className="relative group inline-flex items-center ml-1 cursor-pointer">
        <IoIosInformationCircleOutline className="text-slate-400 text-sm" />
        <span className="absolute left-5 top-0 z-50 hidden group-hover:block bg-gray-800 text-white text-xs rounded-md px-2 py-1 w-44 shadow-lg">
            {text}
        </span>
    </span>
);

const TextField = ({ field, value, onChange }: { field: FilterField; value: string; onChange: (v: string) => void }): JSX.Element => (
    <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full border p-2 rounded outline-none text-sm text-slate-700 dark:text-white dark:bg-gray-600 placeholder:text-slate-400 focus:border-blue-400 transition-colors"
    />
);

const CheckboxGroup = ({ field, value, onChange }: { field: FilterField; value: string[]; onChange: (v: string[]) => void }): JSX.Element => {
    const toggle = (val: string) => {
        if (value.includes(val)) onChange(value.filter((v) => v !== val));
        else onChange([...value, val]);
    };
    return (
        <div className="space-y-2">
            {field.options?.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-300">
                    <input
                        type="checkbox"
                        checked={value.includes(opt.value)}
                        onChange={() => toggle(opt.value)}
                        className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                    />
                    {opt.label}
                    {opt.info && <InfoTooltip text={opt.info} />}
                </label>
            ))}
        </div>
    );
};

const SelectField = ({ field, value, onChange }: { field: FilterField; value: string; onChange: (v: string) => void }): JSX.Element => (
    <div className="flex items-center gap-3">
        {field.label && (
            <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap w-16 shrink-0">{field.label}:</span>
        )}
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 border p-2 rounded outline-none text-sm text-slate-700 dark:text-white dark:bg-gray-600 focus:border-blue-400 transition-colors"
        >
            <option value="">{field.placeholder || "Select..."}</option>
            {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

const MultiSelectField = ({ field, value, onChange }: { field: FilterField; value: string[]; onChange: (v: string[]) => void }): JSX.Element => {
    const [dropOpen, setDropOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setDropOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const remove = (val: string) => onChange(value.filter((v) => v !== val));
    const toggle = (val: string) => {
        if (value.includes(val)) remove(val);
        else { onChange([...value, val]); setSearch(""); }
    };

    const filtered = field.options?.filter(
        (o) => o.label.toLowerCase().includes(search.toLowerCase()) && !value.includes(o.value)
    ) ?? [];

    const selectedLabels = value.map((v) => field.options?.find((o) => o.value === v)?.label ?? v);

    return (
        <div className="relative" ref={ref}>
            {field.label && (
                <span className="text-sm text-slate-500 dark:text-slate-400 block mb-1">{field.label}:</span>
            )}
            <div
                onClick={() => setDropOpen((v) => !v)}
                className="w-full min-h-9.5 border p-2 rounded flex flex-wrap gap-1.5 items-center cursor-pointer dark:bg-gray-600"
            >
                {selectedLabels.map((label, i) => (
                    <span key={i} className="flex items-center gap-1 bg-teal-100 text-teal-700 dark:bg-teal-800 dark:text-teal-200 text-xs px-2 py-0.5 rounded-md">
                        {label}
                        <button onClick={(e) => { e.stopPropagation(); remove(value[i]); }} className="text-teal-500 hover:text-teal-700 leading-none">×</button>
                    </span>
                ))}
                {selectedLabels.length === 0 && (
                    <span className="text-slate-400 text-sm">{field.placeholder || "Select..."}</span>
                )}
                <FaChevronDown className="ml-auto text-slate-400 text-xs shrink-0" />
            </div>

            {dropOpen && (
                <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white dark:bg-gray-800 border rounded shadow-xl py-2 max-h-52 overflow-y-auto">
                    <div className="px-3 pb-2">
                        <div className="flex items-center gap-2 border rounded px-2 py-1.5 dark:bg-gray-700">
                            <IoIosSearch className="text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="outline-none bg-transparent text-sm w-full dark:text-white"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    {filtered.length > 0 ? filtered.map((opt) => (
                        <div
                            key={opt.value}
                            onClick={(e) => { e.stopPropagation(); toggle(opt.value); }}
                            className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2"
                        >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${value.includes(opt.value) ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                                {value.includes(opt.value) && <span className="text-white text-[10px]">✓</span>}
                            </div>
                            {opt.label}
                        </div>
                    )) : (
                        <div className="px-4 py-2 text-sm text-slate-400">No options found</div>
                    )}
                </div>
            )}
        </div>
    );
};

const RangeSliderField = ({ field, value, onChange }: {
    field: FilterField;
    value: { min: number; max: number };
    onChange: (v: { min: number; max: number }) => void;
}): JSX.Element => {
    const cfg = field.sliderConfig!;
    const fmt = cfg.formatLabel ?? ((v: number) => v.toString());
    const pct = (v: number) => ((v - cfg.min) / (cfg.max - cfg.min)) * 100;

    const handleMin = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = Number(e.target.value);
        if (v <= value.max) onChange({ ...value, min: v });
    };
    const handleMax = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = Number(e.target.value);
        if (v >= value.min) onChange({ ...value, max: v });
    };

    return (
        <div>
            {field.label && <label className="text-sm text-slate-500 dark:text-slate-400 block mb-2">{field.label}</label>}
            <div className="relative h-5 flex items-center">
                <div className="absolute w-full h-1.5 bg-slate-200 dark:bg-gray-500 rounded-full" />
                <div
                    className="absolute h-1.5 bg-slate-800 dark:bg-slate-200 rounded-full"
                    style={{ left: `${pct(value.min)}%`, width: `${pct(value.max) - pct(value.min)}%` }}
                />
                <input
                    type="range"
                    min={cfg.min} max={cfg.max} step={cfg.step ?? 1} value={value.min}
                    onChange={handleMin}
                    className="absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-400 [&::-webkit-slider-thumb]:shadow-md"
                />
                <input
                    type="range"
                    min={cfg.min} max={cfg.max} step={cfg.step ?? 1} value={value.max}
                    onChange={handleMax}
                    className="absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-400 [&::-webkit-slider-thumb]:shadow-md"
                />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{fmt(cfg.min)}</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">{fmt(value.min)} – {fmt(value.max)}</span>
                <span>{fmt(cfg.max)}</span>
            </div>
        </div>
    );
};

const DateRangeField = ({ field, value, onChange }: {
    field: FilterField;
    value: { from: string; to: string };
    onChange: (v: { from: string; to: string }) => void;
}): JSX.Element => {
    const cfg = field.dateRangeConfig!;
    return (
        <div className="grid grid-cols-2 gap-3">
            <div>
                <p className="text-xs text-slate-400 mb-1">{cfg.fromLabel ?? "From"}</p>
                <select
                    value={value.from}
                    onChange={(e) => onChange({ ...value, from: e.target.value })}
                    className="w-full border p-2 rounded text-sm dark:bg-gray-600 dark:text-white outline-none focus:border-blue-400"
                >
                    <option value="">Year</option>
                    {cfg.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
            </div>
            <div>
                <p className="text-xs text-slate-400 mb-1">{cfg.toLabel ?? "To"}</p>
                <select
                    value={value.to}
                    onChange={(e) => onChange({ ...value, to: e.target.value })}
                    className="w-full border p-2 rounded text-sm dark:bg-gray-600 dark:text-white outline-none focus:border-blue-400"
                >
                    <option value="">Year</option>
                    {cfg.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
            </div>
        </div>
    );
};

const AIEnrichmentBlock = ({ label, description, ctaText }: { label: string; description: string; ctaText: string }): JSX.Element => (
    <div className="mt-3">
        <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-500">⚡</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-white">{label}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{description}</p>
        <button className="w-full border-2 border-dashed border-purple-400 text-purple-500 text-sm font-medium rounded-lg py-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
            {ctaText}
        </button>
    </div>
);

// ─── Field renderer ───────────────────────────────────────────────────────────

const FieldRenderer = ({ field, values, onChange }: {
    field: FilterField;
    values: FilterValues;
    onChange: (key: string, val: FilterValue) => void;
}): JSX.Element => {
    switch (field.type) {
        case "text":
            return <TextField field={field} value={(values[field.key] as string) ?? ""} onChange={(v) => onChange(field.key, v)} />;
        case "checkbox_group":
            return (
                <>
                    {field.label && (
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                            {field.label}{field.info && <InfoTooltip text={field.info} />}
                        </p>
                    )}
                    <CheckboxGroup field={field} value={(values[field.key] as string[]) ?? []} onChange={(v) => onChange(field.key, v)} />
                </>
            );
        case "select":
            return <SelectField field={field} value={(values[field.key] as string) ?? ""} onChange={(v) => onChange(field.key, v)} />;
        case "multi_select":
            return <MultiSelectField field={field} value={(values[field.key] as string[]) ?? []} onChange={(v) => onChange(field.key, v)} />;
        case "range_slider":
            return (
                <RangeSliderField
                    field={field}
                    value={(values[field.key] as { min: number; max: number }) ?? { min: field.sliderConfig!.min, max: field.sliderConfig!.max }}
                    onChange={(v) => onChange(field.key, v)}
                />
            );
        case "date_range":
            return (
                <DateRangeField
                    field={field}
                    value={(values[field.key] as { from: string; to: string }) ?? { from: "", to: "" }}
                    onChange={(v) => onChange(field.key, v)}
                />
            );
        default:
            return <></>;
    }
};

// ─── Sub-section (ADVANCED / EXCLUDE) ────────────────────────────────────────

const SubSectionBlock = ({ sub, values, onChange }: {
    sub: FilterSubSection;
    values: FilterValues;
    onChange: (key: string, val: FilterValue) => void;
}): JSX.Element => {
    const [open, setOpen] = useState<boolean>(false);
    return (
        <div className="mt-3">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
                {open ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                {sub.label}
            </button>
            {open && (
                <div className="mt-3 space-y-3">
                    {sub.fields.map((field) => (
                        <FieldRenderer key={field.key} field={field} values={values} onChange={onChange} />
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Accordion section ────────────────────────────────────────────────────────

const SectionAccordion = ({ section, values, onChange }: {
    section: FilterSection;
    values: FilterValues;
    onChange: (key: string, val: FilterValue) => void;
}): JSX.Element => {
    const [open, setOpen] = useState<boolean>(section.defaultOpen ?? false);
    return (
        <div className="border-b border-slate-100 dark:border-gray-600 mr-2">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between py-3 hover:bg-slate-50 dark:hover:bg-gray-600/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {section.icon && (() => {
                        const Icon = section.icon;
                        return <span className="text-sm txt-slate-700 dark:text-white"><Icon className="text-base" /></span>;
                    })()}
                    <span className="text-sm  text-slate-700 dark:text-white">{section.label}</span>
                </div>
                {open ? <FaChevronUp className="text-slate-400 text-xs" /> : <FaChevronDown className="text-slate-400 text-xs" />}
            </button>

            {open && (
                <div className="pb-4 space-y-3">
                    {section.fields.map((field) => (
                        <FieldRenderer key={field.key} field={field} values={values} onChange={onChange} />
                    ))}
                    {section.subSections?.map((sub) => (
                        <SubSectionBlock key={sub.label} sub={sub} values={values} onChange={onChange} />
                    ))}
                    {section.aiEnrichment && <AIEnrichmentBlock {...section.aiEnrichment} />}
                </div>
            )}
        </div>
    );
};

// ─── Main component (your original Props shape) ───────────────────────────────

export default function FilterSidebar({ open, onClose, onApply, onReset, onFilterChange ,onInfoTypeChange ,infoValue }: Props): JSX.Element {
    const [values, setValues] = useState<FilterValues>(() => buildDefaultValues(filterOptions));
    const [infoType, setInfoType] = useState<CompanyPeopleToggleType>(infoValue as CompanyPeopleToggleType);
    const activeCount = countActiveFilters(values);

    const handleChange = (key: string, val: FilterValue) => {
        setValues((prev) => {
            const updated = { ...prev, [key]: val };
            onFilterChange?.(updated); // ✅ call parent on every change
            return updated;
        });
    };

    const handleReset = () => {
        setValues(buildDefaultValues(filterOptions));
        onReset?.();
    };

    const handleApply = () => {
        onApply?.(values);
        onClose();
    };

    return (
        <>

            {/* Sidebar */}
            <div
                className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-700 z-50 shadow-lg transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="p-5 overflow-y-auto h-full flex flex-col">

                    {/* Header */}
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <div className="flex items-center gap-2">
                            <MdFilterAlt className="text-blue-600 text-xl" />
                            <h2 className="text-lg font-semibold dark:text-white">Filters</h2>
                            {activeCount > 0 && (
                                <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {activeCount}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-gray-600 text-slate-500 dark:text-slate-300 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="my-2">
                        <CompanyPeopleToggle
                            value={infoType}
                            onChange={(v) => {
                                setInfoType(v);
                                onInfoTypeChange?.(v); 
                            }}
                        />

                    </div>

                    {/* Filters — dynamic sections from filterOptions */}
                    <div className="flex-1 overflow-y-auto">
                        {(filterOptions.sections.filter((section) => (section.type == "both" || section.type == infoType))).map((section) => (
                            <SectionAccordion
                                key={section.key}
                                section={section}
                                values={values}
                                onChange={handleChange}
                            />
                        ))}
                    </div>

                    {/* Footer */}
                    {/* <div className="mt-8 flex gap-3 shrink-0 ">
                        <button
                            onClick={handleReset}
                            className="flex-1 border p-2 rounded text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-600 dark:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm font-medium transition-colors"
                        >
                            Apply{activeCount > 0 ? ` (${activeCount})` : ""}
                        </button>
                    </div> */}

                </div>
            </div>
        </>
    );
}
