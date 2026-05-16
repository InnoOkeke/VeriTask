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

function PaymentHistory({ address }: { address: string }) {
  const [payments, setPayments] = useState<{ id: string; amount: string; from: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${HORIZON}/accounts/${address}/payments?limit=10&order=desc`)
      .then((r) => r.json())
      .then((data) => {
        const records = (data._embedded?.records || [])
          .filter((p: { type: string; asset_code?: string; asset_issuer?: string }) =>
            p.type === "payment" && p.asset_code === "USDC" && p.asset_issuer === USDC_ISSUER
          )
          .slice(0, 5)
          .map((p: { id: string; amount: string; from: string; created_at: string }) => ({
            id: p.id,
            amount: p.amount,
            from: p.from,
            date: new Date(p.created_at).toLocaleDateString(),
          }));
        setPayments(records);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [address]);

  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Payment History</h3>
      </div>
      {loading ? (
        <p className="text-xs text-zinc-600">Loading...</p>
      ) : payments.length === 0 ? (
        <p className="text-xs text-zinc-600">No USDC payments received yet.</p>
      ) : (
        <div className="space-y-1.5">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <span className="text-[10px] text-emerald-400">↓</span>
                </div>
                <span className="text-xs font-medium text-emerald-400">+{p.amount} USDC</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-600 font-mono">{p.from.slice(0, 6)}...</span>
                <span className="text-[10px] text-zinc-600">{p.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const submitted = task.milestones.filter(
    (m) => m.status === "submitted" || m.status === "approved" || m.status === "released" || m.status === "paid"
  ).length;
  const total = task.milestones.length;
  const done = submitted === total;

  return (
    <Link
      href={`/task/${task.id}?as=agent`}
      className="block group"
    >
      <div className="p-5 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 hover:border-zinc-700/50 hover:bg-zinc-900/60 transition-all duration-200">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors leading-snug line-clamp-2">
            {task.title}
          </h3>
          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
            task.status === "open"
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              : task.status === "in_progress"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          }`}>
            {task.status.replace("_", " ")}
          </span>
        </div>

        <p className="text-xs text-zinc-500 line-clamp-2 mb-4 leading-relaxed">{task.description}</p>

        {submitted > 0 ? (
          <div className="mb-4">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5">
              <span>Progress</span>
              <span>{submitted}/{total} milestones</span>
            </div>
            <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  done ? "bg-emerald-500" : "bg-gradient-to-r from-cyan-500 to-violet-500"
                }`}
                style={{ width: `${(submitted / total) * 100}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-cyan-400">{task.totalAmount} USDC</span>
            <span className="text-[10px] text-zinc-600">{total} milestone{total > 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            {task.escrowContractId ? (
              <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded font-mono">
                🔒 Escrowed
              </span>
            ) : null}
            <span className="text-[10px] text-zinc-600 font-mono">{task.employerAddress.slice(0, 6)}...</span>
          </div>
        </div>
      </div>
    </Link>
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
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Overview</h2>
              <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5 space-y-4">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Available</p>
                  <p className="text-2xl font-bold text-white">{loading ? "—" : available.length}</p>
                </div>
                <div className="h-px bg-zinc-800/50" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">My Tasks</p>
                  <p className="text-2xl font-bold text-cyan-400">{loading ? "—" : myTasks.length}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">View</h2>
              <button
                onClick={() => setTab("available")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  tab === "available"
                    ? "bg-zinc-800/50 text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
                }`}
              >
                Available Tasks
              </button>
              <button
                onClick={() => setTab("mine")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  tab === "mine"
                    ? "bg-zinc-800/50 text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
                }`}
              >
                My Tasks
                {myTasks.length > 0 ? (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                    {myTasks.length}
                  </span>
                ) : null}
              </button>
            </div>

            {walletAddress ? <PaymentHistory address={walletAddress} /> : null}
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-white">
                  {tab === "available" ? "Available Tasks" : "My Tasks"}
                </h1>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {tab === "available"
                    ? "Open tasks from all employers"
                    : "Tasks you've submitted work on"}
                </p>
              </div>
              {!loading ? (
                <button
                  onClick={() => { setLoading(true); loadBoard(); }}
                  className="text-xs px-3 py-2 rounded-xl border border-zinc-800 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 transition-all"
                >
                  Refresh
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="text-center py-20">
                <div className="w-5 h-5 border-2 border-zinc-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-zinc-500">Loading tasks...</p>
              </div>
            ) : tab === "available" ? (
              available.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-zinc-800/50 rounded-2xl">
                  <p className="text-zinc-500 text-sm">No open tasks available right now.</p>
                  <p className="text-zinc-600 text-xs mt-1">Tasks posted by employers will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {available.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )
            ) : (
              myTasks.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-zinc-800/50 rounded-2xl">
                  <p className="text-zinc-500 text-sm">No tasks claimed yet.</p>
                  <p className="text-zinc-600 text-xs mt-1">Claim a task from the Available tab to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/task/${task.id}?as=agent`}
                      className="block group"
                    >
                      <div className="p-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] hover:border-emerald-500/20 hover:bg-emerald-500/[0.04] transition-all duration-200">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors leading-snug line-clamp-2">
                            {task.title}
                          </h3>
                          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium capitalize border ${
                            task.status === "paid"
                              ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                              : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                          }`}>
                            {task.status.replace("_", " ")}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-500 line-clamp-1 mb-3">{task.description}</p>

                        {(() => {
                          const done = task.milestones.filter(
                            (m) => m.status === "submitted" || m.status === "approved" || m.status === "released" || m.status === "paid"
                          ).length;
                          return (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5">
                                <span>Progress</span>
                                <span>{done}/{task.milestones.length} milestones</span>
                              </div>
                              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    done === task.milestones.length ? "bg-emerald-500" : "bg-gradient-to-r from-cyan-500 to-violet-500"
                                  }`}
                                  style={{ width: `${(done / task.milestones.length) * 100}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                          <span className="text-sm font-bold text-cyan-400">{task.totalAmount} USDC</span>
                          <span className="text-[10px] text-zinc-600">
                            {task.milestones.length} milestone{task.milestones.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </RequireWallet>
  );
}
