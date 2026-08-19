"use client";

import { useMemo, useState } from "react";
import { EnablementDoc } from "@/src/types/referral/referral.type";
import {
  FileText,
  Download,
  Search,
  FileSpreadsheet,
  Presentation,
  File as FileIcon,
  Clock,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Mock data — replace with API data once the resource library is wired */
/* ------------------------------------------------------------------ */

const MOCK_DOCS: EnablementDoc[] = [
  {
    id: "1",
    title: "HRJee Product Pitch Deck (2026)",
    category: "Pitch Deck",
    fileUrl: "deck.pdf",
    fileType: "pdf",
    fileSize: "4.2 MB",
    updatedAt: "2026-06-01",
  },
  {
    id: "2",
    title: "AI Add-ons Overview Deck",
    category: "Pitch Deck",
    fileUrl: "deck.pptx",
    fileType: "ppt",
    fileSize: "6.8 MB",
    updatedAt: "2026-05-20",
  },
  {
    id: "3",
    title: "Standard Pricing Sheet — FY26",
    category: "Pricing Sheet",
    fileUrl: "y26.xlsx",
    fileType: "xls",
    fileSize: "180 KB",
    updatedAt: "2026-04-15",
  },
  {
    id: "4",
    title: "Enterprise Bundle Pricing Guide",
    category: "Pricing Sheet",
    fileUrl: "pricing.pdf",
    fileType: "pdf",
    fileSize: "620 KB",
    updatedAt: "2026-03-30",
  },
  {
    id: "5",
    title: "Greenfield Manufacturing — Case Study",
    category: "Case Study",
    fileUrl: "new.pdf",
    fileType: "pdf",
    fileSize: "1.1 MB",
    updatedAt: "2026-02-18",
  },
  {
    id: "6",
    title: "Bright Retail — Success Story",
    category: "Case Study",
    fileUrl: "/assets/docs/case-study-bright-retail.pdf",
    fileType: "pdf",
    fileSize: "980 KB",
    updatedAt: "2026-01-22",
  },
  {
    id: "7",
    title: "Partner Brand Guidelines",
    category: "Collateral",
    fileUrl: "/assets/docs/brand-guidelines.pdf",
    fileType: "pdf",
    fileSize: "3.4 MB",
    updatedAt: "2026-05-05",
  },
  {
    id: "8",
    title: "Social Media Kit — Referral Campaign",
    category: "Collateral",
    fileUrl: "/assets/docs/social-kit.zip",
    fileType: "doc",
    fileSize: "12.5 MB",
    updatedAt: "2026-04-02",
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const FILE_ICON: Record<string, React.ReactNode> = {
  pdf: <FileText size={18} />,
  ppt: <Presentation size={18} />,
  xls: <FileSpreadsheet size={18} />,
  doc: <FileIcon size={18} />,
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PartnerDocuments() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<EnablementDoc["category"] | "All">("All");

  const categories: EnablementDoc["category"][] = [
    "Pitch Deck",
    "Pricing Sheet",
    "Case Study",
    "Collateral",
  ];

  const filteredDocs = useMemo(() => {
    return MOCK_DOCS.filter((d) => {
      const matchesCategory = activeCategory === "All" || d.category === activeCategory;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || d.title.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  function handleDownload(doc: EnablementDoc) {
    if (!doc.fileUrl) return;
    const link = document.createElement("a");
    link.href = doc.fileUrl;
    link.download = doc.title;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const groupedByCategory = categories.map((cat) => ({
    category: cat,
    docs: filteredDocs.filter((d) => d.category === cat),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Documents & Resources</h1>
        <p className="text-sm text-text-2">
          Shared pitch decks, pricing sheets, and case studies from HRJee
        </p>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("All")}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              activeCategory === "All"
                ? "border-cyan-500 bg-cyan-500 text-white"
                : "border-slate-300 text-text-2 hover:bg-surface-hover"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                activeCategory === cat
                  ? "border-cyan-600 bg-cyan-500 text-white"
                  : "border-slate-300 text-text-2 hover:bg-surface-hover"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-brand-600 sm:w-64"
          />
        </div>
      </div>

      {/* Document groups */}
      {filteredDocs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <FileText size={28} className="mx-auto mb-2 text-text-2" />
          <p className="text-sm text-text-2">No documents match your search.</p>
        </div>
      ) : (
        groupedByCategory
          .filter((g) => g.docs.length > 0)
          .map((group) => (
            <div key={group.category}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                {group.category}
                <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-normal text-text-2">
                  {group.docs.length}
                </span>
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="group flex items-start justify-between gap-3 rounded-lg border border-slate-300 p-3 transition hover:border-brand-600/40 hover:bg-surface-hover"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="mt-0.5 shrink-0 rounded-md bg-brand-50 p-1.5 text-brand-600">
                        {FILE_ICON[doc.fileType ?? "pdf"] ?? <FileText size={18} />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{doc.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-2">
                          {doc.fileSize && <span>{doc.fileSize}</span>}
                          {doc.fileSize && doc.updatedAt && <span>•</span>}
                          {doc.updatedAt && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {formatDate(doc.updatedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(doc)}
                      className="shrink-0 rounded-md p-1.5 text-text-2 transition hover:bg-white hover:text-brand-600"
                      title={`Download ${doc.title}`}
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
      )}

      {/* Phase 3 teaser — Co-branded collateral generator (doc §5.9) */}
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-text-2">
        <Sparkles size={18} className="shrink-0 text-brand-600" />
        <div>
          <p className="font-medium text-text-1">Co-branded collateral generator</p>
          <p className="text-xs">Coming soon — generate pitch decks and one-pagers pre-branded with your logo.</p>
        </div>
      </div>
    </div>
  );
}