"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/WalletProvider";
import { useEscrowService } from "@/lib/escrowService";
import { addTask } from "@/lib/store";
import type { Task } from "@/lib/types";
import { RequireWallet } from "@/components/RequireWallet";
import { WalletSetupBanner } from "@/components/WalletSetupBanner";

const TRUSTLINE_ADDRESS = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const PLATFORM_FEE = 4;

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

const loadDraft = (): Draft | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveDraft = (draft: Draft) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

const clearDraft = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
};

export default function CreateTask() {
  const router = useRouter();
  const { walletAddress } = useWallet();
  const { handleDeploy, handleFund } = useEscrowService();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [milestones, setMilestones] = useState<NewMilestone[]>([{ id: "m1", description: "", amount: 0 }]);
  const [deploying, setDeploying] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [draftAvailable, setDraftAvailable] = useState(!!loadDraft());

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

  const loadDraftForm = () => {
    const saved = loadDraft();
    if (!saved) return;
    setTitle(saved.title || "");
    setDescription(saved.description || "");
    setMilestones(saved.milestones?.length ? saved.milestones : [{ id: "m1", description: "", amount: 0 }]);
    setDraftAvailable(false);
  };

  const dismissDraft = () => {
    clearDraft();
    setDraftAvailable(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return;
    if (!title || !description || milestones.some((m) => !m.description || !m.amount)) return;

    setDeploying(true);
    setError("");

    const engagementId = `eng-${Date.now()}`;
    let contractId = "";

    try {
      setStatus("Step 1/3: Requesting escrow deployment from Trustless Work API...");
      const result = await handleDeploy({
        signer: walletAddress,
        engagementId,
        title,
        description,
        platformFee: PLATFORM_FEE,
        roles: {
          approver: walletAddress,
          serviceProvider: walletAddress,
          platformAddress: walletAddress,
          releaseSigner: walletAddress,
          disputeResolver: walletAddress,
        },
        milestones: milestones.map((m) => ({
          description: m.description,
          amount: m.amount,
          receiver: walletAddress,
        })),
        trustline: {
          symbol: "USDC",
          address: TRUSTLINE_ADDRESS,
        },
      });

      contractId = result.contractId;
      if (!contractId) {
        throw new Error("Escrow deployed but no contract ID returned from API");
      }

      setStatus("Step 2/3: Waiting for Stellar network confirmation (8s)...");
      await new Promise((r) => setTimeout(r, 8000));

      setStatus("Step 3/3: Funding escrow with USDC...");
      await handleFund({
        contractId,
        signer: walletAddress,
        amount: totalAmount,
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
        employerAddress: walletAddress,
        escrowContractId: contractId,
        escrowData: result.escrow as Record<string, unknown> | undefined,
        engagementId,
        createdAt: new Date(),
      };

      await addTask(task);
      clearDraft();
      setStatus("Task created and escrow funded!");
      setTimeout(() => router.push("/employer"), 1500);
    } catch (err) {
      let msg = "";
      if (err && typeof err === "object") {
        const e = err as Record<string, unknown>;
        if (typeof e.message === "string" && e.message) msg = e.message;
        if (e.response && typeof e.response === "object") {
          const r = e.response as Record<string, unknown>;
          if (r.data && typeof r.data === "object") {
            const d = r.data as Record<string, unknown>;
            if (typeof d.message === "string") msg = d.message;
            else if (typeof d.error === "string") msg = d.error;
            else msg = JSON.stringify(d);
          } else if (typeof r.status === "number") {
            msg = `API error ${r.status}: ${msg}`;
          }
        }
      }
      if (!msg) msg = "Unknown error during deployment";
      console.error("Deploy failed:", err);
      setError(`Deploy failed: ${msg}`);
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
        {draftAvailable ? (
          <div className="mb-6 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-4">
            <p className="text-xs text-amber-300/80">You have a saved draft from a previous session.</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={loadDraftForm}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
              >
                Load Draft
              </button>
              <button
                type="button"
                onClick={dismissDraft}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {status ? (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-400">
            {status}
          </div>
        ) : null}
        {error ? (
          <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400">
            {error}
          </div>
        ) : null}

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
                <div key={m.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-mono">Milestone {i + 1}</span>
                    {milestones.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeMilestone(m.id)}
                        disabled={deploying}
                        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    ) : null}
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
                      onChange={(e) => updateMilestone(m.id, "amount", parseFloat(e.target.value) || 0)}
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
