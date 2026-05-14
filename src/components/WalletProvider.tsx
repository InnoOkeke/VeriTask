"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import {
  isConnected as freighterIsConnected,
  requestAccess,
  getAddress,
} from "@stellar/freighter-api";

interface WalletState {
  connected: boolean;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  connected: false,
  publicKey: null,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(async () => {
    try {
      const connResult = await freighterIsConnected();
      if (!connResult.isConnected) {
        alert("Please install Freighter wallet extension");
        return;
      }
      const access = await requestAccess();
      if (access.error) {
        alert("Failed to connect: " + access.error);
        return;
      }
      const addr = await getAddress();
      setPublicKey(addr.address);
      setConnected(true);
    } catch {
      alert("Failed to connect wallet. Make sure Freighter is installed and unlocked.");
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setConnected(false);
  }, []);

  return (
    <WalletContext.Provider value={{ connected, publicKey, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
