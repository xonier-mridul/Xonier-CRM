"use client";

import { useTranslation } from "@/lib/i18n";
import { batchRows } from "@/lib/mockData";
import { Card, Eyebrow, GhostButton } from "@/components/shared/Primitives";
import Badge from "@/components/shared/Badge";
import { Table, Thead, Th, Tr, Td } from "@/components/shared/Table";

export default function AdminBatches() {
  const { t } = useTranslation();

  return (
    <div>
      <Eyebrow>{t("admin.batches.eyebrow")}</Eyebrow>
      <h2 className="mb-4.5 text-base">{t("nav.payoutBatches")}</h2>
      <Card>
        <Table>
          <Thead>
            <Tr>
              <Th>{t("table.batch")}</Th>
              <Th>{t("table.period")}</Th>
              <Th num>{t("table.total")}</Th>
              <Th>{t("table.status")}</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <tbody>
            {batchRows.map((row, i) => (
              <Tr key={i}>
                <Td num>{row.batch}</Td>
                <Td num>{row.period}</Td>
                <Td num>{row.total}</Td>
                <Td>
                  <Badge tone={row.status}>{t(`badge.${row.status}`)}</Badge>
                </Td>
                <Td>
                  <GhostButton>{row.status === "pending" ? t("admin.batches.markPaid") : t("common.view")}</GhostButton>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
