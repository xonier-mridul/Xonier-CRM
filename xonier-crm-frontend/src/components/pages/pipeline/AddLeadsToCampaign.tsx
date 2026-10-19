"use client";
import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import { UploadCloud } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import CampaignService from "@/src/services/campaign.service";
import { CsvMappingModal, LEAD_FIELDS } from "./CreateCampaignModal";

interface Props {
  campaignId: string;
  onImported: () => void;
}

type Parsed = { headers: string[]; rows: Record<string, string>[] };

const parseFile = (file: File): Promise<Parsed> =>
  new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) =>
          resolve({ headers: res.meta.fields || [], rows: res.data as Record<string, string>[] }),
        error: reject,
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: "array" });
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
          resolve({ headers: json.length ? Object.keys(json[0]) : [], rows: json });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    }
  });

const AddLeadsToCampaign: React.FC<Props> = ({ campaignId, onImported }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const p = await parseFile(file);
      if (!p.headers.length || !p.rows.length) {
        toast.warning("File is empty");
        return;
      }
      setParsed(p);
    } catch {
      toast.error("Could not parse the file");
    }
  };

  const confirm = async (mapping: Record<string, string>) => {
    if (!parsed) return;
    const leads = parsed.rows
      .map((row) => {
        const lead: Record<string, any> = {};
        LEAD_FIELDS.forEach((f) => {
          const col = mapping[f.key];
          if (col && row[col] != null && row[col] !== "") lead[f.key] = String(row[col]).trim();
        });
        return lead;
      })
      .filter((l) => l.email && l.fullName);

    if (!leads.length) {
      toast.error("No valid rows found (fullName and email are required)");
      return;
    }

    setIsImporting(true);
    try {
      const res = await CampaignService.importLeads(campaignId, { leads });
      if (res.status === 201 || res.status === 200) {
        const { inserted = 0, skipped = 0 } = res.data?.data || {};
        if (inserted > 0) {
          toast.success(`Added ${inserted} new lead${inserted !== 1 ? "s" : ""}${skipped ? ` (${skipped} duplicate/invalid skipped)` : ""}`);
        } else {
          toast.info(`No new leads added${skipped ? ` — ${skipped} duplicate/invalid skipped` : ""}`);
        }
        setParsed(null);
        onImported();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Lead import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-sm transition-colors"
      >
        <UploadCloud size={14} /> Add Leads
      </button>
      {parsed && (
        <CsvMappingModal
          csvHeaders={parsed.headers}
          previewRows={parsed.rows}
          onConfirm={confirm}
          onCancel={() => setParsed(null)}
          isImporting={isImporting}
        />
      )}
    </>
  );
};

export default AddLeadsToCampaign;
