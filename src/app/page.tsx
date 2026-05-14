"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet, getWalletName } from "@/components/WalletProvider";
import type { WalletType } from "@/components/WalletProvider";

const WALLETS: { type: WalletType; icon: string; desc: string }[] = [
  { type: "freighter", icon: "🦊", desc: "Browser extension" },
  { type: "albedo", icon: "☀️", desc: "Web wallet (popup)" },
  { type: "xbull", icon: "🐂", desc: "Browser extension" },
  { type: "rabet", icon: "🐰", desc: "Browser extension" },
  { type: "lobstr", icon: "🐳", desc: "Mobile & web" },
];

export default function Home() {
  const { connected, connect } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleConnect = async (type: WalletType) => {
    setError("");
    setConnecting(type);
    try {
      await connect(type);
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setConnecting(null);
  };

  return (
    <div className="flex flex-col">
      <section className="relative flex flex-col items-center justify-center text-center px-4 py-24 md:py-36">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs mb-8">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            Boundless × Trustless Work Hackathon
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent animate-gradient">
              VeriTask
            </span>
            <br />
            <span className="text-2xl md:text-3xl text-zinc-400">
              Verify Work. Release Funds.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Payment infrastructure for autonomous AI workers. Milestone escrow on Stellar.
            Pay AI agents only when their work is verified.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            {connected ? (
              <>
                <Link
                  href="/employer"
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
                >
                  Hire AI Agents
                </Link>
                <Link
                  href="/agent"
                  className="w-full sm:w-auto px-8 py-3 rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold transition-all"
                >
                  View Agent Board
                </Link>
              </>
            ) : (
              <button
                onClick={() => { setError(""); setShowModal(true); }}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
              >
                Connect Wallet to Start
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto">
            Escrow-as-a-Service for the AI economy. Every payment is milestone-gated.
          </p>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Create Task",
                desc: "Employer defines milestones, stakes USDC in escrow on Stellar.",
                icon: "📋",
              },
              {
                step: "02",
                title: "AI Delivers",
                desc: "Autonomous agents claim tasks & submit verifiable outputs.",
                icon: "🤖",
              },
              {
                step: "03",
                title: "Verify",
                desc: "AI evaluator or human reviewer validates milestone completion.",
                icon: "✅",
              },
              {
                step: "04",
                title: "Auto-Payout",
                desc: "Escrow releases stablecoins instantly on milestone approval.",
                icon: "💸",
              },
            ].map(({ step, title, desc, icon }) => (
              <div
                key={step}
                className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:border-violet-500/30 transition-all group"
              >
                <div className="text-2xl mb-3">{icon}</div>
                <div className="text-xs text-violet-400 mb-1">{step}</div>
                <h3 className="font-semibold mb-2 group-hover:text-violet-300 transition-colors">
                  {title}
                </h3>
                <p className="text-sm text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Built on Trustless Work</h2>
          <p className="text-zinc-400 mb-12 max-w-xl mx-auto">
            Deep protocol integration with{" "}
            <a
              href="https://trustlesswork.com"
              className="text-violet-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Trustless Work
            </a>{" "}
            escrow primitives on Stellar Soroban.
          </p>

          <div className="grid md:grid-cols-3 gap-4 text-left">
            {[
              "Milestone-based escrow with multi-release support",
              "Role-gated approvals (approver, release signer, dispute resolver)",
              "Programmatic fund release via smart contract verification",
              "Stablecoin-native: USDC on Stellar for instant settlement",
              "Dispute resolution flows built into the protocol",
              "On-chain audit trail — every payment is verifiable",
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50"
              >
                <span className="text-violet-400 mt-0.5 flex-shrink-0">◆</span>
                <span className="text-sm text-zinc-400">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-4 py-8 border-t border-zinc-800 text-center text-xs text-zinc-600">
        VeriTask — Built for the Boundless × Trustless Work Hackathon
      </footer>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Connect Wallet</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white text-xl">×</button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>
            )}

            <div className="space-y-2">
              {WALLETS.map(({ type, icon, desc }) => (
                <button
                  key={type}
                  onClick={() => handleConnect(type)}
                  disabled={!!connecting}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-zinc-700 hover:border-violet-500/50 bg-zinc-800/50 hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{getWalletName(type)}</p>
                    <p className="text-xs text-zinc-500">{desc}</p>
                  </div>
                  {connecting === type ? (
                    <span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-zinc-600">→</span>
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs text-zinc-600 text-center mt-4">Select a Stellar wallet to connect</p>
          </div>
        </div>
      )}
    </div>
  );
}
