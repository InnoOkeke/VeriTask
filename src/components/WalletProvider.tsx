"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import type { ISupportedWallet } from "@creit.tech/stellar-wallets-kit/types";
import { KitEventType } from "@creit.tech/stellar-wallets-kit/types";

export type WalletType = string;

interface WalletState {
  connected: boolean;
  publicKey: string | null;
  walletType: WalletType | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signXdr: (xdr: string, networkPassphrase?: string) => Promise<string>;
  availableWallets: ISupportedWallet[];
  showWalletModal: boolean;
  openWalletModal: () => void;
  closeWalletModal: () => void;
}

const WalletContext = createContext<WalletState>({
  connected: false,
  publicKey: null,
  walletType: null,
  connect: async () => {},
  disconnect: () => {},
  signXdr: async () => "",
  availableWallets: [],
  showWalletModal: false,
  openWalletModal: () => {},
  closeWalletModal: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [availableWallets, setAvailableWallets] = useState<ISupportedWallet[]>([]);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize the kit once
  useEffect(() => {
    if (initialized) return;
    try {
      StellarWalletsKit.init({
        modules: defaultModules(),
      });
      setInitialized(true);

      // Load supported wallets
      StellarWalletsKit.refreshSupportedWallets().then((wallets) => {
        setAvailableWallets(wallets.filter((w) => w.isAvailable !== false));
      });

      // Listen for state updates
      StellarWalletsKit.on(KitEventType.STATE_UPDATED, (event) => {
        if (event.payload.address) {
          setPublicKey(event.payload.address);
          setConnected(true);
        setWalletType(StellarWalletsKit.selectedModule?.productName || null);
        }
      });

      // Listen for disconnects
      StellarWalletsKit.on(KitEventType.DISCONNECT, () => {
        setPublicKey(null);
        setConnected(false);
        setWalletType(null);
      });
    } catch {
      setInitialized(true);
    }
  }, [initialized]);

  const connect = useCallback(async () => {
    try {
      const result = await StellarWalletsKit.authModal();
      if (result.address) {
        setPublicKey(result.address);
        setConnected(true);
        setWalletType(StellarWalletsKit.selectedModule?.productName || null);
        setShowWalletModal(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Modal closed by user — not an error
      if (!msg.includes("closed") && !msg.includes("cancel")) {
        throw new Error(msg);
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    setPublicKey(null);
    setConnected(false);
    setWalletType(null);
  }, []);

  const signXdr = useCallback(
    async (xdr: string, networkPassphrase?: string): Promise<string> => {
      if (!connected) throw new Error("Wallet not connected");

      const passphrase = networkPassphrase || "Test SDF Network ; September 2015";
      const result = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase: passphrase,
      });

      if (!result.signedTxXdr) throw new Error("Failed to sign transaction");
      return result.signedTxXdr;
    },
    [connected]
  );

  return (
    <WalletContext.Provider
      value={{
        connected,
        publicKey,
        walletType,
        connect,
        disconnect,
        signXdr,
        availableWallets,
        showWalletModal,
        openWalletModal: () => setShowWalletModal(true),
        closeWalletModal: () => setShowWalletModal(false),
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
