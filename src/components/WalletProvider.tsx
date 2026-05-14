"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";

export type WalletType = string;

interface ISupportedWallet {
  id: string;
  name: string;
  type: string;
  isAvailable: boolean;
  isPlatformWrapper: boolean;
  icon: string;
  url: string;
}

interface WalletState {
  connected: boolean;
  publicKey: string | null;
  walletType: WalletType | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signXdr: (xdr: string, networkPassphrase?: string) => Promise<string>;
  availableWallets: ISupportedWallet[];
}

const WalletContext = createContext<WalletState>({
  connected: false,
  publicKey: null,
  walletType: null,
  connect: async () => {},
  disconnect: () => {},
  signXdr: async () => "",
  availableWallets: [],
});

// Lazy-loaded references to avoid Turbopack sub-path resolution issues
let StellarWalletsKitModule: typeof import("@creit.tech/stellar-wallets-kit") | null = null;

async function loadWalletKit() {
  if (StellarWalletsKitModule) return StellarWalletsKitModule;
  StellarWalletsKitModule = await import("@creit.tech/stellar-wallets-kit");
  return StellarWalletsKitModule;
}

async function loadDefaultModules(): Promise<unknown[]> {
  const mod = await import("@creit.tech/stellar-wallets-kit/modules/utils");
  return (mod as { defaultModules: (opts?: { filterBy?: (m: unknown) => boolean }) => unknown[] }).defaultModules();
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [availableWallets, setAvailableWallets] = useState<ISupportedWallet[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    (async () => {
      try {
        const kit = await loadWalletKit();
        const modules = await loadDefaultModules();

        kit.StellarWalletsKit.init({
          modules: modules as Parameters<typeof kit.StellarWalletsKit.init>[0]["modules"],
        });

        const wallets = await kit.StellarWalletsKit.refreshSupportedWallets();
        setAvailableWallets(
          wallets.filter((w: ISupportedWallet) => w.isAvailable !== false)
        );

        kit.StellarWalletsKit.on(kit.KitEventType.STATE_UPDATED, (event) => {
          if (event.payload.address) {
            setPublicKey(event.payload.address);
            setConnected(true);
            setWalletType(kit.StellarWalletsKit.selectedModule?.productName || null);
          }
        });

        kit.StellarWalletsKit.on(kit.KitEventType.DISCONNECT, () => {
          setPublicKey(null);
          setConnected(false);
          setWalletType(null);
        });

        setInitialized(true);
      } catch {
        setInitialized(true);
      }
    })();
  }, [initialized]);

  const connect = useCallback(async () => {
    const kit = await loadWalletKit();
    try {
      const result = await kit.StellarWalletsKit.authModal();
      if (result.address) {
        setPublicKey(result.address);
        setConnected(true);
        setWalletType(kit.StellarWalletsKit.selectedModule?.productName || null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("closed") && !msg.includes("cancel")) {
        throw new Error(msg);
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const kit = await loadWalletKit();
      await kit.StellarWalletsKit.disconnect();
    } catch {
      // Ignore
    }
    setPublicKey(null);
    setConnected(false);
    setWalletType(null);
  }, []);

  const signXdr = useCallback(
    async (xdr: string, networkPassphrase?: string): Promise<string> => {
      if (!connected) throw new Error("Wallet not connected");
      const kit = await loadWalletKit();
      const passphrase = networkPassphrase || "Test SDF Network ; September 2015";
      const result = await kit.StellarWalletsKit.signTransaction(xdr, {
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
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
