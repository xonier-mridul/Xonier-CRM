"use client";

import { useTranslation } from "react-i18next";
import { Card, Eyebrow, Footnote, PrimaryButton, RowBetween } from "../shared/Primitives";
import { Table, Td, Th, Thead, Tr } from "../shared/Table";
import { approvalRows } from "@/src/constants/referral";

export default function AdminQueue() {
  const { t } = useTranslation();

  return (
    <div>
      <RowBetween>
        <div>
          <Eyebrow>{t("admin.queue.eyebrow")}</Eyebrow>
          <h2 className="text-base text-slate-600">{t("nav.approvalQueue")}</h2>
        </div>
        <PrimaryButton>{t("admin.queue.approveAll")}</PrimaryButton>
      </RowBetween>
      <Card>
        <Table>
          <Thead>
            <Tr>
              <Th>{t("table.partner")}</Th>
              <Th>{t("table.client")}</Th>
              <Th>{t("table.dealType")}</Th>
              <Th num>{t("table.revenue")}</Th>
              <Th num>{t("table.commission")}</Th>
              <Th num>{t("table.commissionPct")}</Th>
              <Th>{t("table.action")}</Th>
            </Tr>
          </Thead>
          <tbody>
            {approvalRows.map((row, i) => (
              <Tr key={i}>
                <Td>{row.partner}</Td>
                <Td>{row.client}</Td>
                <Td>{t(`${row.dealType}`)}</Td>
                <Td num>{row.revenue}</Td>
                <Td num>{row.commission}</Td>
                <Td num>{row.commissionPct}</Td>
                <Td>
                  <div className="flex gap-2">
                    <button className="text-teal-400 hover:text-teal-600">{t("common.approve")}</button>
                    <button className="text-red-400 hover:text-red-600">{t("common.hold")}</button>
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
