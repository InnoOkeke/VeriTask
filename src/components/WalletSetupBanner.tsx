"use client";

import { useState } from "react";
import { useWallet } from "@/components/WalletProvider";
import { Account, Asset, Operation, TransactionBuilder, Networks } from "@stellar/stellar-sdk";

const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export function WalletSetupBanner() {
  const { connected, publicKey, signXdr } = useWallet();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!connected || !publicKey || dismissed) return null;

  const addTrustline = async () => {
    if (!publicKey) return;
    setLoading(true);
    setResult(null);

    try {
      // Fetch account sequence from Horizon
      const horizon = "https://horizon-testnet.stellar.org";
      const resp = await fetch(`${horizon}/accounts/${publicKey}`);
      if (!resp.ok) {
        throw new Error(
          "Account not found on testnet. Fund it with XLM first: https://laboratory.stellar.org/#account-creator?network=test"
        );
      }
      const accountData = await resp.json();

      // Build ChangeTrust transaction
      const account = new Account(accountData.account_id, accountData.sequence);
      const tx = new TransactionBuilder(account, {
        fee: "10000",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.changeTrust({
            asset: new Asset("USDC", USDC_ISSUER),
          })
        )
        .setTimeout(30)
        .build();

      const xdr = tx.toXDR();

      // Sign with connected wallet
      const signedXdr = await signXdr(xdr, Networks.TESTNET);

      // Submit to Horizon
      const submitResp = await fetch(`${horizon}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `tx=${encodeURIComponent(signedXdr)}`,
      });

      const submitJson = await submitResp.json();

      if (submitJson.successful || submitJson.hash) {
        setResult({ ok: true, msg: "USDC trustline added successfully!" });
      } else {
        setResult({
          ok: false,
          msg: submitJson.extras?.result_codes?.operations?.[0] || submitJson.title || "Failed",
        });
      }
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : String(err) });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6">
      <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-300 mb-3">
              Testnet Wallet Setup
            </h3>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-300 font-medium">1. Fund with testnet XLM</p>
                  <p className="text-[11px] text-zinc-500">
                    <a
                      href="https://laboratory.stellar.org/#account-creator?network=test"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline"
                    >
                      Open Stellar Laboratory →
                    </a>
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-300 font-medium">2. Add USDC Trustline</p>
                  <p className="text-[11px] text-zinc-500">
                    Allows your wallet to hold USDC
                  </p>
                </div>
                <button
                  onClick={addTrustline}
                  disabled={loading}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {loading ? "Signing..." : "Add Trustline"}
                </button>
              </div>

              {/* Step 3 */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-300 font-medium">3. Get testnet USDC</p>
                  <p className="text-[11px] text-zinc-500">
                    <a
                      href="https://docs.trustlesswork.com/trustless-work/introduction/stellar-and-soroban-the-backbone-of-trustless-work/testnet-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline"
                    >
                      Trustless Work Testnet Tokens →
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {result && (
              <div
                className={`mt-3 p-2 rounded-lg text-xs ${
                  result.ok
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                {result.msg}
              </div>
            )}

            <div className="mt-3 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <p className="text-[10px] font-mono text-zinc-500 break-all">
                {publicKey}
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-zinc-500 hover:text-white text-lg flex-shrink-0"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
