"use client";

import { useWallet } from "@/components/WalletProvider";

export const RequireWallet = ({ children }: { children: React.ReactNode }) => {
  const { walletAddress } = useWallet();

  if (!walletAddress) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500">Connect your wallet to continue.</p>
      </div>
    );
  }

  return <>{children}</>;
};
