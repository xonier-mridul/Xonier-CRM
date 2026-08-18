"use client";

import { useTranslation } from "@/lib/i18n";
import { approvalRows } from "@/lib/mockData";
import { Card, Eyebrow, Footnote, GhostButton, PrimaryButton, RowBetween } from "@/components/shared/Primitives";
import { Table, Thead, Th, Tr, Td } from "@/components/shared/Table";

export default function AdminQueue() {
  const { t } = useTranslation();

  return (
    <div>
      <RowBetween>
        <div>
          <Eyebrow>{t("admin.queue.eyebrow")}</Eyebrow>
          <h2 className="text-base">{t("nav.approvalQueue")}</h2>
        </div>
        <PrimaryButton>{t("admin.queue.approveAll")}</PrimaryButton>
      </RowBetween>
      <Card>
        <Table>
          <Thead>
            <Tr>
              <Th>{t("table.partner")}</Th>
              <Th>{t("table.client")}</Th>
              <Th num>{t("table.revenue")}</Th>
              <Th num>{t("table.commission")}</Th>
              <Th num>{t("table.tier")}</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <tbody>
            {approvalRows.map((row, i) => (
              <Tr key={i}>
                <Td>{row.partner}</Td>
                <Td>{row.client}</Td>
                <Td num>{row.revenue}</Td>
                <Td num>{row.commission}</Td>
                <Td num>{row.tierPct}</Td>
                <Td>
                  <div className="flex gap-2">
                    <GhostButton>{t("common.approve")}</GhostButton>
                    <GhostButton danger>{t("common.hold")}</GhostButton>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Footnote>{t("admin.queue.footnote")}</Footnote>
    </div>
  );
}
