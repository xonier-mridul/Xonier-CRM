import { ReactNode } from "react";

interface ReferralLayoutProps { children: ReactNode;}

export default function ReferralLayout({
  children,
}: ReferralLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}