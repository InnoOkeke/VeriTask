"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet, getWalletInfo } from "@/components/WalletProvider";
import { usePathname } from "next/navigation";
import type { WalletType } from "@/components/WalletProvider";

export function Header() {
  const {
    connected, publicKey, walletType, connect, disconnect,
    availableWallets, showWalletModal, openWalletModal, closeWalletModal,
  } = useWallet();
  const pathname = usePathname();
  const [connecting, setConnecting] = useState<WalletType | null>(null);
  const [error, setError] = useState("");

  const shortKey = publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : "";
  const walletInfo = walletType ? getWalletInfo(walletType) : null;

  const handleConnect = async (type: WalletType) => {
    setError("");
    setConnecting(type);
    try {
      await connect(type);
      closeWalletModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setConnecting(null);
  };

  return (
    <>
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
            {connected && walletInfo ? (
              <div className="flex items-center gap-3">
                <span className="text-sm">{walletInfo.icon}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    {walletInfo.name}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">{shortKey}</span>
                </div>
                <button
                  onClick={disconnect}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setError("");
                  openWalletModal();
                }}
                className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors font-medium"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => closeWalletModal()} />
          <div className="relative z-10 w-full max-w-sm mx-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Connect Wallet</h2>
              <button
                onClick={() => closeWalletModal()}
                className="text-zinc-500 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <div className="space-y-2">
              {availableWallets.map((type) => {
                const info = getWalletInfo(type);
                const isConnecting = connecting === type;

                return (
                  <button
                    key={type}
                    onClick={() => handleConnect(type)}
                    disabled={!!connecting}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-zinc-700 hover:border-violet-500/50 bg-zinc-800/50 hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <span className="text-2xl">{info.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{info.name}</p>
                      <p className="text-xs text-zinc-500">
                        {type === "freighter"
                          ? "Browser extension"
                          : type === "albedo"
                            ? "Web wallet (popup)"
                            : type === "lobstr"
                              ? "Mobile & web wallet"
                              : "Coming soon"}
                      </p>
                    </div>
                    {isConnecting ? (
                      <span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-zinc-600">→</span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-zinc-600 text-center mt-4">
              Select a Stellar wallet to connect
            </p>
          </div>
        </div>
      )}
    </>
  );
}
