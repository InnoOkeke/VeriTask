"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/components/WalletProvider";
import { RequireWallet } from "@/components/RequireWallet";
import { WalletSetupBanner } from "@/components/WalletSetupBanner";
import { loadTasks } from "@/lib/store";
import type { Task } from "@/lib/types";

const HORIZON = "https://horizon-testnet.stellar.org";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function RingProgress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-10 h-10 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22" cy="22" r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-zinc-800"
        />
        <circle
          cx="22" cy="22" r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={pct === 100 ? "text-emerald-400" : "text-cyan-400"}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-zinc-400">
        {done}
      </span>
    </div>
  );
}

function PaymentHistory({ address }: { address: string }) {
  const [payments, setPayments] = useState<{ id: string; amount: string; from: string; date: string }[]>([]);

  useEffect(() => {
    fetch(`${HORIZON}/accounts/${address}/payments?limit=10&order=desc`)
      .then((r) => r.json())
      .then((data) => {
        const records = (data._embedded?.records || [])
          .filter((p: { type: string; asset_code?: string; asset_issuer?: string }) =>
            p.type === "payment" && p.asset_code === "USDC" && p.asset_issuer === USDC_ISSUER
          )
          .slice(0, 4)
          .map((p: { id: string; amount: string; from: string; created_at: string }) => ({
            id: p.id,
            amount: p.amount,
            from: p.from,
            date: new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          }));
        setPayments(records);
      })
      .catch(() => {});
  }, [address]);

  if (payments.length === 0) return null;

  return (
    <div className="mt-12">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Recent Payments</h3>
      <div className="space-y-px rounded-2xl overflow-hidden bg-zinc-900/40 border border-zinc-800/40">
        {payments.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center justify-between px-5 py-3.5 bg-zinc-950/60 hover:bg-zinc-900/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-200">+{p.amount} USDC</p>
                <p className="text-[10px] text-zinc-500 font-mono">from {p.from.slice(0, 8)}...</p>
              </div>
            </div>
            <span className="text-[10px] text-zinc-600">{p.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AgentBoard() {
  const { walletAddress } = useWallet();
  const [available, setAvailable] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"available" | "mine">("available");

  const loadBoard = async () => {
    const all = await loadTasks();
    setAvailable(all.filter((t) => t.status === "open" || t.status === "claimed" || t.status === "in_progress"));
    if (walletAddress) {
      setMyTasks(
        all.filter(
          (t) => t.agentAddress === walletAddress &&
            (t.status === "in_progress" || t.status === "completed" || t.status === "paid")
        )
      );
    }
    setLoading(false);
  };

  useEffect(() => { loadBoard(); }, [walletAddress]);

  return (
    <RequireWallet>
      <WalletSetupBanner />
      <div className="max-w-6xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-14">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium text-cyan-400 uppercase tracking-[0.2em] mb-3">Agent Workspace</p>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                {tab === "available" ? "Discover" : "My Work"}
              </h1>
              <p className="text-base text-zinc-500 mt-2 font-light">
                {tab === "available"
                  ? "Browse and claim tasks from employers worldwide."
                  : "Track your claimed tasks and submissions."}
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-900/60 border border-zinc-800/40">
              <button
                onClick={() => setTab("available")}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                  tab === "available"
                    ? "bg-white text-black shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Available
              </button>
              <button
                onClick={() => setTab("mine")}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                  tab === "mine"
                    ? "bg-white text-black shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                My Tasks
                {myTasks.length > 0 ? (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 text-zinc-600">{myTasks.length}</span>
                ) : null}
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-8 mt-10">
            <div>
              <p className="text-3xl font-bold text-white">{loading ? "—" : available.length}</p>
              <p className="text-xs text-zinc-500 mt-1 font-light">Open Tasks</p>
            </div>
            <div className="w-px h-10 bg-zinc-800" />
            <div>
              <p className="text-3xl font-bold text-cyan-400">{loading ? "—" : myTasks.length}</p>
              <p className="text-xs text-zinc-500 mt-1 font-light">Claimed</p>
            </div>
            <div className="flex-1" />
            {!loading ? (
              <button
                onClick={() => { setLoading(true); loadBoard(); }}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-4 h-4 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          </div>
        ) : tab === "available" ? (
          available.length === 0 ? (
            <div className="text-center py-32">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900/60 border border-zinc-800/40 flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-zinc-400 font-medium">No open tasks</p>
              <p className="text-sm text-zinc-600 mt-1 font-light">Tasks posted by employers will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {available.map((task) => {
                const done = task.milestones.filter(
                  (m) => m.status === "submitted" || m.status === "approved" || m.status === "released" || m.status === "paid"
                ).length;

                return (
                  <Link
                    key={task.id}
                    href={`/task/${task.id}?as=agent`}
                    className="group block rounded-3xl p-6 bg-zinc-900/30 border border-zinc-800/30 hover:border-zinc-700/40 hover:bg-zinc-900/50 transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                        task.status === "in_progress"
                          ? "bg-cyan-500/10 text-cyan-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                        task.status === "in_progress"
                          ? "bg-cyan-500/10 text-cyan-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white mb-2 leading-snug group-hover:text-zinc-200 transition-colors line-clamp-2">
                      {task.title}
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mb-6 font-light">
                      {task.description}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800/30">
                      <span className="text-base font-bold text-white">{task.totalAmount} <span className="text-xs font-normal text-zinc-500">USDC</span></span>
                      <div className="flex items-center gap-1.5">
                        <RingProgress done={done} total={task.milestones.length} />
                        <span className="text-[10px] text-zinc-600">{task.milestones.length} milestone{task.milestones.length > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          myTasks.length === 0 ? (
            <div className="text-center py-32">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900/60 border border-zinc-800/40 flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-zinc-400 font-medium">Nothing claimed yet</p>
              <p className="text-sm text-zinc-600 mt-1 font-light">Switch to Available to find work.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
                {myTasks.map((task) => {
                  const done = task.milestones.filter(
                    (m) => m.status === "submitted" || m.status === "approved" || m.status === "released" || m.status === "paid"
                  ).length;
                  const earned = task.milestones
                    .filter((m) => m.status === "released" || m.status === "paid")
                    .reduce((sum, m) => sum + m.amount, 0);

                  return (
                    <Link
                      key={task.id}
                      href={`/task/${task.id}?as=agent`}
                      className="group block rounded-3xl p-6 bg-zinc-900/30 border border-zinc-800/30 hover:border-zinc-700/40 hover:bg-zinc-900/50 transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className="flex items-start justify-between mb-5">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                          task.status === "paid"
                            ? "bg-violet-500/10 text-violet-400"
                            : "bg-cyan-500/10 text-cyan-400"
                        }`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                          task.status === "paid"
                            ? "bg-violet-500/10 text-violet-400"
                            : "bg-cyan-500/10 text-cyan-400"
                        }`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-white mb-2 leading-snug group-hover:text-zinc-200 transition-colors line-clamp-2">
                        {task.title}
                      </h3>

                      <div className="flex items-center gap-3 mb-5">
                        <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              done === task.milestones.length ? "bg-emerald-400" : "bg-gradient-to-r from-cyan-400 to-violet-400"
                            }`}
                            style={{ width: `${(done / task.milestones.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-600 font-medium tabular-nums">{done}/{task.milestones.length}</span>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/30">
                        <div>
                          <span className="text-base font-bold text-white">{task.totalAmount} <span className="text-xs font-normal text-zinc-500">USDC</span></span>
                          {earned > 0 ? (
                            <span className="ml-2 text-[10px] text-emerald-400 font-medium">+{earned} earned</span>
                          ) : null}
                        </div>
                        <span className="text-[10px] text-zinc-600">
                          {task.milestones.length} milestone{task.milestones.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {walletAddress ? <PaymentHistory address={walletAddress} /> : null}
            </>
          )
        )}
      </div>
    </RequireWallet>
  );
}
