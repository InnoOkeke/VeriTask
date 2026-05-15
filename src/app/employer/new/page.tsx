"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/WalletProvider";
import { useEscrowService } from "@/lib/escrowService";
import { addTask } from "@/lib/store";
import type { Task, Milestone } from "@/lib/types";
import { RequireWallet } from "@/components/RequireWallet";
import { WalletSetupBanner } from "@/components/WalletSetupBanner";

interface NewMilestone {
  id: string;
  description: string;
  amount: number;
}

interface Draft {
  title: string;
  description: string;
  milestones: NewMilestone[];
}

const DRAFT_KEY = "veritask_create_draft";

function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function clearDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
}

export default function CreateTask() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const escrow = useEscrowService();

  const draft = loadDraft();
  const [title, setTitle] = useState(draft?.title || "");
  const [description, setDescription] = useState(draft?.description || "");
  const [milestones, setMilestones] = useState<NewMilestone[]>(
    draft?.milestones?.length ? draft.milestones : [{ id: "m1", description: "", amount: 0 }]
  );
  const [deploying, setDeploying] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // Auto-save to localStorage on every change
  useEffect(() => {
    saveDraft({ title, description, milestones });
  }, [title, description, milestones]);

  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      { id: `m${Date.now()}`, description: "", amount: 0 },
    ]);
  };

  const removeMilestone = (id: string) => {
    if (milestones.length <= 1) return;
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMilestone = (id: string, field: keyof NewMilestone, value: string | number) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const totalAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;
    if (!title || !description || milestones.some((m) => !m.description || !m.amount)) return;

    setDeploying(true);
    setStatus("Deploying escrow on Stellar Testnet...");
    setError("");

    const engagementId = `eng-${Date.now()}`;
    const PLATFORM_FEE = 2;

    try {
      const result = await escrow.deploy({
        signer: publicKey,
        engagementId,
        title,
        description,
        platformFee: PLATFORM_FEE,
        roles: {
          approver: publicKey,
          serviceProvider: publicKey,
          platformAddress: publicKey,
          releaseSigner: publicKey,
          disputeResolver: publicKey,
        },
        milestones: milestones.map((m) => ({
          description: m.description,
          amount: m.amount,
          receiver: publicKey,
        })),
        trustline: {
          symbol: "USDC",
          address: publicKey,
        },
      });

      const contractId = result.contractId;

      setStatus("Escrow deployed. Waiting for confirmation...");

      // Poll Horizon until contract is visible or timeout
      const horizon = "https://horizon-testnet.stellar.org";
      let confirmed = false;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const check = await fetch(`${horizon}/accounts/${contractId}`);
          if (check.ok) {
            confirmed = true;
            break;
          }
        } catch {
          // Not found yet, keep polling
        }
      }

      if (!confirmed) {
        throw new Error("Escrow contract not confirmed on-chain after 40 seconds. Try again.");
      }

      setStatus("Escrow confirmed. Funding...");

      await escrow.fund({
        contractId,
        signer: publicKey,
        amount: totalAmount + PLATFORM_FEE,
      });

      const task: Task = {
        id: engagementId,
        title,
        description,
        totalAmount,
        asset: "USDC",
        status: "open",
        milestones: milestones.map((m, i) => ({
          id: `m${i + 1}`,
          description: m.description,
          amount: m.amount,
          status: "pending" as const,
        })),
        employerAddress: publicKey,
        escrowContractId: contractId,
        engagementId,
        createdAt: new Date(),
      };

      addTask(task);
      clearDraft();
      setStatus("Task created and escrow funded!");
      setTimeout(() => router.push("/employer"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deploy escrow");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <RequireWallet>
      <WalletSetupBanner />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={() => router.back()}
          className="text-sm text-zinc-500 hover:text-white mb-6 transition-colors"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold mb-2">Create AI Task</h1>
        <p className="text-zinc-400 text-sm mb-1">
          Define milestones. An escrow is deployed on Stellar — funds release only when each milestone is verified.
        </p>
        {(draft && (draft.title || draft.description)) && (
          <p className="text-xs text-zinc-600 mb-6">
            Form auto-saved.{" "}
            <button
              type="button"
              onClick={() => { clearDraft(); setTitle(""); setDescription(""); setMilestones([{ id: "m1", description: "", amount: 0 }]); }}
              className="text-zinc-500 hover:text-red-400 transition-colors underline"
            >
              Clear draft
            </button>
          </p>
        )}
        {(!draft || (!draft.title && !draft.description)) && (
          <p className="text-xs text-zinc-600 mb-6">Form auto-saves to this device.</p>
        )}

        {status && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-400">
            {status}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Generate SEO Product Descriptions"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
              required
              disabled={deploying}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what the AI agent needs to do..."
              rows={3}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
              required
              disabled={deploying}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-zinc-300">Milestones</label>
              <button
                type="button"
                onClick={addMilestone}
                disabled={deploying}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50"
              >
                + Add Milestone
              </button>
            </div>

            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-mono">Milestone {i + 1}</span>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(m.id)}
                        disabled={deploying}
                        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={m.description}
                    onChange={(e) => updateMilestone(m.id, "description", e.target.value)}
                    placeholder="e.g., Complete first batch of work"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    required
                    disabled={deploying}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">USDC</span>
                    <input
                      type="number"
                      value={m.amount || ""}
                      onChange={(e) =>
                        updateMilestone(m.id, "amount", parseFloat(e.target.value) || 0)
                      }
                      placeholder="Amount"
                      min={1}
                      step={0.01}
                      className="w-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                      required
                      disabled={deploying}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <span className="text-sm text-zinc-300">Total Escrow Amount</span>
            <span className="text-lg font-bold text-violet-400">
              {totalAmount} USDC
            </span>
          </div>

          <button
            type="submit"
            disabled={deploying}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deploying ? "Deploying Escrow..." : "Deploy Escrow & Fund"}
          </button>
        </form>
      </div>
    </RequireWallet>
  );
}
