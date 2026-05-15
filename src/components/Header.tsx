"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/components/WalletProvider";
import { usePathname } from "next/navigation";

const HORIZON = "https://horizon-testnet.stellar.org";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function WalletBalance({ address }: { address: string }) {
  const [xlm, setXlm] = useState<string | null>(null);
  const [usdc, setUsdc] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${HORIZON}/accounts/${address}`)
      .then((r) => r.json())
      .then((data) => {
        const native = data.balances?.find((b: { asset_type: string }) => b.asset_type === "native");
        const usdcBalance = data.balances?.find(
          (b: { asset_code?: string; asset_issuer?: string }) =>
            b.asset_code === "USDC" && b.asset_issuer === USDC_ISSUER
        );
        if (native) setXlm(parseFloat(native.balance).toFixed(2));
        if (usdcBalance) setUsdc(parseFloat(usdcBalance.balance).toFixed(2));
      })
      .catch(() => {});
  }, [address]);

  if (xlm === null && usdc === null) return null;

  return (
    <div className="flex items-center gap-2">
      {usdc !== null ? (
        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {usdc} USDC
        </span>
      ) : null}
      {xlm !== null ? (
        <span className="text-xs px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-600/20">
          {xlm} XLM
        </span>
      ) : null}
    </div>
  );
}

export const Header = () => {
  const { walletAddress, walletName, handleConnect, handleDisconnect } = useWallet();
  const pathname = usePathname();

  const shortKey = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  return (
    <header className="border-b border-zinc-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              VeriTask
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6">
            <Link
              href="/employer"
              className={`text-sm transition-colors ${
                pathname.startsWith("/employer") ? "text-violet-400" : "text-zinc-400 hover:text-white"
              }`}
            >
              Hire AI
            </Link>
            <Link
              href="/agent"
              className={`text-sm transition-colors ${
                pathname.startsWith("/agent") ? "text-cyan-400" : "text-zinc-400 hover:text-white"
              }`}
            >
              AI Agent Board
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {walletAddress ? (
            <div className="flex items-center gap-3">
              <WalletBalance address={walletAddress} />
              {walletName ? (
                <span className="text-xs px-2 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {walletName}
                </span>
              ) : null}
              <span className="text-xs text-zinc-500 font-mono">{shortKey}</span>
              <button
                onClick={handleDisconnect}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors font-medium"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
