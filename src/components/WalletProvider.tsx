"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";

type SupportedWallet = {
  id: string;
  name: string;
  type: string;
  isAvailable: boolean;
  isPlatformWrapper: boolean;
  icon: string;
  url: string;
};

type WalletContextType = {
  walletAddress: string | null;
  walletName: string | null;
  setWalletInfo: (address: string, name: string) => void;
  clearWalletInfo: () => void;
};

const WalletContext = createContext<WalletContextType>({
  walletAddress: null,
  walletName: null,
  setWalletInfo: () => {},
  clearWalletInfo: () => {},
});

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);

  useEffect(() => {
    const storedAddress = localStorage.getItem("walletAddress");
    const storedName = localStorage.getItem("walletName");
    if (storedAddress) setWalletAddress(storedAddress);
    if (storedName) setWalletName(storedName);
  }, []);

  const setWalletInfo = useCallback((address: string, name: string) => {
    setWalletAddress(address);
    setWalletName(name);
    localStorage.setItem("walletAddress", address);
    localStorage.setItem("walletName", name);
  }, []);

  const clearWalletInfo = useCallback(() => {
    setWalletAddress(null);
    setWalletName(null);
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("walletName");
  }, []);

  return (
    <WalletContext.Provider value={{ walletAddress, walletName, setWalletInfo, clearWalletInfo }}>
      {children}
    </WalletContext.Provider>
  );
};

// Lazy-load the wallet kit to avoid Turbopack sub-path resolution
let kitModule: {
  StellarWalletsKit: {
    init: (params: { modules: unknown[] }) => void;
    authModal: (params?: { modalTitle?: string; onWalletSelected?: (option: SupportedWallet) => void }) => Promise<{ address: string }>;
    signTransaction: (xdr: string, opts?: { address?: string; networkPassphrase?: string }) => Promise<{ signedTxXdr: string; signerAddress?: string }>;
    getAddress: () => Promise<{ address: string }>;
    disconnect: () => Promise<void>;
    on: (type: string, callback: (event: unknown) => void) => () => void;
    selectedModule: { productName?: string } | null;
    refreshSupportedWallets: () => Promise<SupportedWallet[]>;
  };
  defaultModules: (opts?: { filterBy?: (m: unknown) => boolean }) => unknown[];
  KitEventType: { STATE_UPDATED: string; DISCONNECT: string };
} | null = null;

async function loadKit() {
  if (kitModule) return kitModule;
  const [main, utils] = await Promise.all([
    import("@creit.tech/stellar-wallets-kit"),
    import("@creit.tech/stellar-wallets-kit/modules/utils"),
  ]);
  kitModule = {
    StellarWalletsKit: main.StellarWalletsKit,
    defaultModules: utils.defaultModules,
    KitEventType: main.KitEventType,
  };
  return kitModule;
}

export const useWallet = () => {
  const context = useContext(WalletContext);

  const connectWallet = useCallback(async () => {
    const kit = await loadKit();
    const modules = kit.defaultModules();
    kit.StellarWalletsKit.init({ modules });

    const result = await kit.StellarWalletsKit.authModal();
    const name = kit.StellarWalletsKit.selectedModule?.productName || "Unknown Wallet";
    context.setWalletInfo(result.address, name);
  }, [context]);

  const disconnectWallet = useCallback(async () => {
    const kit = await loadKit();
    await kit.StellarWalletsKit.disconnect();
    context.clearWalletInfo();
  }, [context]);

  const signTransaction = useCallback(
    async (unsignedTransaction: string, address: string): Promise<string> => {
      const kit = await loadKit();
      const { signedTxXdr } = await kit.StellarWalletsKit.signTransaction(
        unsignedTransaction,
        { address, networkPassphrase: "Test SDF Network ; September 2015" }
      );
      return signedTxXdr;
    },
    []
  );

  const handleConnect = useCallback(async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  }, [connectWallet]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectWallet();
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  }, [disconnectWallet]);

  return {
    walletAddress: context.walletAddress,
    walletName: context.walletName,
    connectWallet,
    disconnectWallet,
    handleConnect,
    handleDisconnect,
    signTransaction,
  };
};
