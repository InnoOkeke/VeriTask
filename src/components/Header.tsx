"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/components/WalletProvider";
import { usePathname } from "next/navigation";

const HORIZON = "https://horizon-testnet.stellar.org";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function WalletDropdown({ address, onDisconnect }: { address: string; onDisconnect: () => void }) {
  const [open, setOpen] = useState(false);
  const [xlm, setXlm] = useState<string | null>(null);
  const [usdc, setUsdc] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${HORIZON}/accounts/${address}`)
      .then((r) => r.json())
      .then((data) => {
        const native = data.balances?.find((b: { asset_type: string }) => b.asset_type === "native");
        const u = data.balances?.find(
          (b: { asset_code?: string; asset_issuer?: string }) =>
            b.asset_code === "USDC" && b.asset_issuer === USDC_ISSUER
        );
        if (native) setXlm(parseFloat(native.balance).toFixed(2));
        if (u) setUsdc(parseFloat(u.balance).toFixed(2));
      })
      .catch(() => {});
  }, [address]);

  const shortKey = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
          {address.slice(2, 4).toUpperCase()}
        </div>
        <span className="text-xs text-zinc-300 font-mono hidden sm:inline">{shortKey}</span>
        <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 z-50 overflow-hidden">
            <div className="p-4 border-b border-zinc-800/50">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Connected Wallet</p>
              <p className="text-xs font-mono text-zinc-300 break-all">{address}</p>
            </div>
            <div className="p-4 border-b border-zinc-800/50 space-y-2.5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Balances</p>
              {usdc !== null ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-[10px] text-emerald-400 font-bold">$</span>
                    </div>
                    <span className="text-xs text-zinc-400">USDC</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">{usdc}</span>
                </div>
              ) : null}
              {xlm !== null ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center">
                      <span className="text-[10px] text-zinc-300">✦</span>
                    </div>
                    <span className="text-xs text-zinc-400">XLM</span>
                  </div>
                  <span className="text-xs font-semibold text-zinc-300">{xlm}</span>
                </div>
              ) : null}
              {(usdc === null && xlm === null) ? (
                <p className="text-xs text-zinc-600">Loading balances...</p>
              ) : null}
            </div>
            <div className="p-2">
              <button
                onClick={() => { setOpen(false); onDisconnect(); }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export const Header = () => {
  const { walletAddress, handleConnect, handleDisconnect } = useWallet();
  const pathname = usePathname();

  const linkClasses = (path: string) =>
    `text-sm transition-colors ${
      pathname.startsWith(path) ? "text-white" : "text-zinc-500 hover:text-zinc-300"
    }`;

  return (
    <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">V</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
              VeriTask
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-8">
            <Link href="/employer" className={linkClasses("/employer")}>
              Hire AI
            </Link>
            <Link href="/agent" className={linkClasses("/agent")}>
              Agent Board
            </Link>
          </nav>
        </div>
        <div className="flex items-center">
          {walletAddress ? (
            <WalletDropdown address={walletAddress} onDisconnect={handleDisconnect} />
          ) : (
            <button
              onClick={handleConnect}
              className="text-sm px-5 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-colors font-semibold"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
