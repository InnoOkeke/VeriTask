"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/WalletProvider";

export function RequireWallet({ children }: { children: React.ReactNode }) {
  const { connected, publicKey } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!connected) {
      router.replace("/");
    }
  }, [connected, router]);

  if (!connected || !publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500">Connect your Freighter wallet to continue.</p>
      </div>
    );
  }

  return <>{children}</>;
}
