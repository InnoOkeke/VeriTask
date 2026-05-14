"use client";

import { TrustlessWorkEscrowProvider } from "@/components/TrustlessWorkEscrowProvider";
import { WalletProvider } from "@/components/WalletProvider";
import { Header } from "@/components/Header";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TrustlessWorkEscrowProvider>
      <WalletProvider>
        <Header />
        <main className="flex-1">{children}</main>
      </WalletProvider>
    </TrustlessWorkEscrowProvider>
  );
}
