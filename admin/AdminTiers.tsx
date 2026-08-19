"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { tierRows as initialTierRows } from "@/lib/mockData";
import { Button, Card, Eyebrow, Footnote, GhostButton, PrimaryButton } from "@/components/shared/Primitives";
import { Table, Thead, Th, Tr, Td } from "@/components/shared/Table";
import { TierRow } from "@/types";

function Cell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[7px] border border-line bg-paper-2 px-2.5 py-2 text-[12.5px] text-text-1"
    />
  );
}

export default function AdminTiers() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<TierRow[]>(initialTierRows);

  const updateRow = (i: number, key: keyof TierRow, value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  };

  const addTier = () => {
    setRows((prev) => [...prev, { minUsers: "", maxUsers: "", commissionPct: "", effectiveFrom: "" }]);
  };

  const removeTier = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <Eyebrow>{t("admin.tiers.eyebrow")}</Eyebrow>
      <h2 className="mb-4.5 text-base">{t("nav.commissionTiers")}</h2>
      <Card>
        <Table>
          <Thead>
            <Tr>
              <Th>{t("table.minUsers")}</Th>
              <Th>{t("table.maxUsers")}</Th>
              <Th>{t("table.commissionPct")}</Th>
              <Th>{t("table.effectiveFrom")}</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <tbody>
            {rows.map((row, i) => (
              <Tr key={i}>
                <Td>
                  <Cell value={row.minUsers} onChange={(v) => updateRow(i, "minUsers", v)} />
                </Td>
                <Td>
                  <Cell value={row.maxUsers} onChange={(v) => updateRow(i, "maxUsers", v)} />
                </Td>
                <Td>
                  <Cell value={row.commissionPct} onChange={(v) => updateRow(i, "commissionPct", v)} />
                </Td>
                <Td>
                  <Cell value={row.effectiveFrom} onChange={(v) => updateRow(i, "effectiveFrom", v)} />
                </Td>
                <Td>
                  <GhostButton danger onClick={() => removeTier(i)}>
                    {t("common.remove")}
                  </GhostButton>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <div className="mt-3.5 flex gap-2">
          <Button onClick={addTier}>+ {t("admin.tiers.addTier")}</Button>
          <PrimaryButton>{t("admin.tiers.saveTierTable")}</PrimaryButton>
        </div>
      </Card>
      <Footnote>{t("admin.tiers.footnote")}</Footnote>
    </div>
  );
}
