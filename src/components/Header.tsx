"use client";

import Link from "next/link";
import { useWallet } from "@/components/WalletProvider";
import { usePathname } from "next/navigation";

export function Header() {
  const { connected, publicKey, walletType, connect, disconnect } = useWallet();
  const pathname = usePathname();

  const shortKey = publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : "";

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
                pathname.startsWith("/employer")
                  ? "text-violet-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Hire AI
            </Link>
            <Link
              href="/agent"
              className={`text-sm transition-colors ${
                pathname.startsWith("/agent")
                  ? "text-cyan-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              AI Agent Board
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {connected ? (
            <div className="flex items-center gap-3">
              {walletType && (
                <span className="text-xs px-2 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {walletType}
                </span>
              )}
              <span className="text-xs text-zinc-500 font-mono">{shortKey}</span>
              <button
                onClick={disconnect}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors font-medium"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
