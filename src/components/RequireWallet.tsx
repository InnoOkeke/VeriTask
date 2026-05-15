"use client";

import { useWallet } from "@/components/WalletProvider";

export function RequireWallet({ children }: { children: React.ReactNode }) {
  const { connected, publicKey } = useWallet();

  if (!connected || !publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500">Connect your wallet to continue.</p>
      </div>
    );
  }

  return <>{children}</>;
}
