"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { ReactNode } from "react";
import {
  isConnected as freighterIsConnected,
  requestAccess as freighterRequestAccess,
  getAddress as freighterGetAddress,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";

export type WalletType = "freighter" | "albedo" | "xbull" | "rabet" | "lobstr";

const WALLET_INFO: Record<WalletType, { name: string; icon: string; color: string }> = {
  freighter: { name: "Freighter", icon: "🦊", color: "from-amber-500 to-orange-600" },
  albedo: { name: "Albedo", icon: "☀️", color: "from-yellow-400 to-amber-500" },
  xbull: { name: "xBull", icon: "🐂", color: "from-emerald-500 to-teal-600" },
  rabet: { name: "Rabet", icon: "🐰", color: "from-pink-500 to-rose-600" },
  lobstr: { name: "LOBSTR", icon: "🐳", color: "from-blue-500 to-cyan-600" },
};

export function getWalletInfo(type: WalletType) {
  return WALLET_INFO[type] || { name: type, icon: "🔑", color: "from-zinc-500 to-zinc-600" };
}

interface WalletState {
  connected: boolean;
  publicKey: string | null;
  walletType: WalletType | null;
  connect: (type: WalletType) => Promise<void>;
  disconnect: () => void;
  signXdr: (xdr: string, networkPassphrase?: string) => Promise<string>;
  availableWallets: WalletType[];
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

function detectAvailableWallets(): WalletType[] {
  const available: WalletType[] = [];

  if (typeof window !== "undefined") {
    const w = window as unknown as Record<string, unknown>;

    // Freighter
    if (w.freighter || w.freighterApi) {
      available.push("freighter");
    }

    // xBull
    if (w.xBullSDK) {
      available.push("xbull");
    }

    // Lobstr (WalletConnect-based detection)
    available.push("lobstr");
  }

  // Albedo and Rabet are always available (web-based)
  available.push("albedo");
  available.push("rabet");

  return available;
}

async function connectAlbedo(): Promise<string> {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      "https://albedo.link/authenticate",
      "albedo-auth",
      "width=400,height=600"
    );
    if (!popup) {
      reject(new Error("Popup blocked. Please allow popups for this site."));
      return;
    }

    const handler = (event: MessageEvent) => {
      if (event.origin !== "https://albedo.link") return;
      if (event.data?.pubkey) {
        window.removeEventListener("message", handler);
        popup.close();
        resolve(event.data.pubkey);
      } else if (event.data?.error) {
        window.removeEventListener("message", handler);
        popup.close();
        reject(new Error(event.data.error));
      }
    };

    window.addEventListener("message", handler);

    setTimeout(() => {
      window.removeEventListener("message", handler);
      popup.close();
      reject(new Error("Albedo connection timed out"));
    }, 120000);
  });
}

async function signWithAlbedo(xdr: string, pubkey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      `https://albedo.link/sign?xdr=${encodeURIComponent(xdr)}&pubkey=${pubkey}&network=testnet`,
      "albedo-sign",
      "width=400,height=600"
    );
    if (!popup) {
      reject(new Error("Popup blocked. Please allow popups for this site."));
      return;
    }

    const handler = (event: MessageEvent) => {
      if (event.origin !== "https://albedo.link") return;
      if (event.data?.signed_envelope_xdr) {
        window.removeEventListener("message", handler);
        popup.close();
        resolve(event.data.signed_envelope_xdr);
      } else if (event.data?.error) {
        window.removeEventListener("message", handler);
        popup.close();
        reject(new Error(event.data.error));
      }
    };

    window.addEventListener("message", handler);

    setTimeout(() => {
      window.removeEventListener("message", handler);
      popup.close();
      reject(new Error("Albedo signing timed out"));
    }, 120000);
  });
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [availableWallets] = useState<WalletType[]>(detectAvailableWallets);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const connect = useCallback(async (type: WalletType) => {
    try {
      switch (type) {
        case "freighter": {
          const connResult = await freighterIsConnected();
          if (!connResult.isConnected) {
            throw new Error("Freighter is not installed. Get it at freighter.app");
          }
          const access = await freighterRequestAccess();
          if (access.error) throw new Error(String(access.error));
          const addr = await freighterGetAddress();
          setPublicKey(addr.address);
          break;
        }

        case "albedo": {
          const pk = await connectAlbedo();
          setPublicKey(pk);
          break;
        }

        case "xbull":
          throw new Error("xBull wallet is available via Freighter API in modern versions.");

        case "rabet":
          throw new Error(
            "Rabet wallet integration coming soon. Please use Freighter or Albedo."
          );

        case "lobstr":
          throw new Error(
            "LOBSTR integration coming soon. Please use Freighter or Albedo."
          );

        default:
          throw new Error(`Unknown wallet type: ${type}`);
      }

      setWalletType(type);
      setConnected(true);
      setShowWalletModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setConnected(false);
    setWalletType(null);
  }, []);

  const signXdr = useCallback(
    async (xdr: string, networkPassphrase?: string): Promise<string> => {
      if (!connected || !publicKey) throw new Error("Wallet not connected");

      const passphrase = networkPassphrase || "Test SDF Network ; September 2015";

      switch (walletType) {
        case "freighter": {
          const result = await freighterSignTransaction(xdr, {
            networkPassphrase: passphrase,
            address: publicKey,
          });
          if (result.error) throw new Error(String(result.error));
          if (!result.signedTxXdr) throw new Error("Failed to sign transaction");
          return result.signedTxXdr;
        }

        case "albedo": {
          return signWithAlbedo(xdr, publicKey);
        }

        default:
          throw new Error(`Signing not supported for ${walletType}`);
      }
    },
    [connected, publicKey, walletType]
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
