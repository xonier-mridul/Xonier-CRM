"use client";

import { commissionRules as initialRules } from "@/src/constants/referral";
import { CommissionRule } from "@/src/types/referral/referral.type";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, Eyebrow, Footnote, GhostButton, PrimaryButton } from "../shared/Primitives";
import { Table, Td, Th, Thead, Tr } from "../shared/Table";
import { MdDelete } from "react-icons/md";

// Configurable commission rule engine (PRD 5.6): tier-based % by deal type,
// with override support for negotiated terms (PRD Table 2.1 / 8.1).

function TextCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[7px] border border-slate-200 bg-paper-2 px-2.5 py-2 text-[12.5px] text-text-1"
    />
  );
}

function NumberCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-[7px] border border-slate-200 bg-paper-2 px-2.5 py-2 text-[12.5px] text-text-1"
    />
  );
}

export default function AdminTiers() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CommissionRule[]>(initialRules);

  const updateRow = <K extends keyof CommissionRule>(i: number, key: K, value: CommissionRule[K]) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  };

  const addRule = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `rule-${Date.now()}`,
        dealType: "new_subscription",
        label: "",
        percentage: 0,
        effectiveFrom: "",
        description: "",
      },
    ]);
  };

  const removeRule = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <Eyebrow>{t("admin.tiers.eyebrow")}</Eyebrow>
      <h2 className="mb-4.5 text-base text-slate-600">{t("nav.commissionTiers")}</h2>
      <Card>
        <Table>
          <Thead>
            <Tr>
              <Th>{t("table.dealType")}</Th>
              <Th>{t("table.description")}</Th>
              <Th num>{t("table.commissionPct")}</Th>
              <Th>{t("table.effectiveFrom")}</Th>
              <Th>{t("table.action")}</Th>
            </Tr>
          </Thead>
          <tbody>
            {rows.map((row, i) => (
              <Tr key={row.id}>
                <Td>
                  <select
                    value={row.dealType}
                    onChange={(e) => updateRow(i, "dealType", e.target.value as CommissionRule["dealType"])}
                    className="w-full rounded-[7px] border border-slate-200 bg-paper-2 px-2.5 py-2 text-[12.5px] text-text-1"
                  >
                    <option value="new_subscription">{t("new_subscription")}</option>
                    <option value="renewal">{t("renewal")}</option>
                    <option value="additional_license">{t("additional_license")}</option>
                    <option value="upsell">{t("upsell")}</option>
                    <option value="ai_addon">{t("ai_addon")}</option>
                  </select>
                </Td>
                <Td>
                  <TextCell value={row.description} onChange={(v) => updateRow(i, "description", v)} />
                </Td>
                <Td>
                  <NumberCell value={row.percentage} onChange={(v) => updateRow(i, "percentage", v)} />
                </Td>
                <Td>
                  <TextCell value={row.effectiveFrom} onChange={(v) => updateRow(i, "effectiveFrom", v)} />
                </Td>
                <Td>
                  <button className="text-red-300 hover:text-red-400 flex text-xl justify-center" onClick={() => removeRule(i)}>
                    <MdDelete />
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <div className="mt-3.5 flex gap-2">
          <Button onClick={addRule}>+ {t("admin.tiers.addTier")}</Button>
          <PrimaryButton>{t("admin.tiers.saveTierTable")}</PrimaryButton>
        </div>
      </Card>
      <Footnote>{t("admin.tiers.footnote")}</Footnote>
    </div>
  );
}
