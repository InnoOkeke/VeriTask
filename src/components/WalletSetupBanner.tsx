"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletProvider";

export function WalletSetupBanner() {
  const { connected, publicKey } = useWallet();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [publicKey]);

  if (!connected || !publicKey || dismissed) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6">
      <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-amber-300 mb-2">
              Testnet Wallet Setup Required
            </h3>
            <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside">
              <li>
                Fund your wallet with testnet XLM:{" "}
                <a
                  href="https://laboratory.stellar.org/#account-creator?network=test"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline"
                >
                  Stellar Laboratory →
                </a>
              </li>
              <li>
                Add USDC trustline:{" "}
                <a
                  href={`https://laboratory.stellar.org/#txbuilder?network=test&params=ChangeTrustOp%7B%22source%22%3A%22${publicKey}%22%2C%22asset%22%3A%7B%22code%22%3A%22USDC%22%2C%22issuer%22%3A%22GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5%22%7D%7D`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline"
                >
                  Open Trustline Builder →
                </a>
                {" "}(sign with Freighter)
              </li>
              <li>
                Get testnet USDC:{" "}
                <a
                  href="https://docs.trustlesswork.com/trustless-work/introduction/stellar-and-soroban-the-backbone-of-trustless-work/testnet-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline"
                >
                  Trustless Work Testnet Tokens →
                </a>
              </li>
            </ol>
            <div className="mt-3 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <p className="text-[10px] font-mono text-zinc-500 break-all">
                Your address: {publicKey}
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
