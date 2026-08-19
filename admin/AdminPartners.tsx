"use client";

import { useTranslation } from "@/lib/i18n";
import { partnerRows } from "@/lib/mockData";
import { Card, Eyebrow, PrimaryButton, RowBetween } from "@/components/shared/Primitives";
import Badge from "@/components/shared/Badge";
import AvatarSm from "@/components/shared/AvatarSm";
import { Table, Thead, Th, Tr, Td } from "@/components/shared/Table";

export default function AdminPartners() {
  const { t } = useTranslation();

  return (
    <div>
      <RowBetween>
        <div>
          <Eyebrow>{t("admin.partners.eyebrow")}</Eyebrow>
          <h2 className="text-base">{t("nav.partners")}</h2>
        </div>
        <PrimaryButton>+ {t("admin.partners.newPartner")}</PrimaryButton>
      </RowBetween>
      <Card>
        <Table>
          <Thead>
            <Tr>
              <Th>{t("table.partner")}</Th>
              <Th num>{t("table.clients")}</Th>
              <Th num>{t("table.referredMrr")}</Th>
              <Th>{t("table.agreement")}</Th>
              <Th>{t("table.status")}</Th>
            </Tr>
          </Thead>
          <tbody>
            {partnerRows.map((p, i) => (
              <Tr key={i}>
                <Td>
                  <AvatarSm initials={p.initials} />
                  {p.name}
                </Td>
                <Td num>{p.clients}</Td>
                <Td num>{p.referredMrr}</Td>
                <Td num>{t("admin.partners.expires", { date: p.agreement })}</Td>
                <Td>
                  <Badge tone={p.status}>{t(`badge.${p.status === "trial" ? "onboarding" : p.status}`)}</Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
