"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import {
  isConnected as freighterIsConnected,
  requestAccess,
  getAddress as freighterGetAddress,
  signTransaction as freighterSign,
} from "@stellar/freighter-api";

export type WalletType = "freighter" | "albedo" | "xbull" | "rabet" | "lobstr";

const WALLET_META: Record<WalletType, { name: string }> = {
  freighter: { name: "Freighter" },
  albedo:  { name: "Albedo" },
  xbull:   { name: "xBull" },
  rabet:   { name: "Rabet" },
  lobstr:  { name: "LOBSTR" },
};

export function getWalletName(type: WalletType): string {
  return WALLET_META[type]?.name || type;
}

// --------------- Albedo helpers ---------------
function albedoPopup(url: string): Promise<MessageEvent> {
  return new Promise((resolve, reject) => {
    const popup = window.open(url, "albedo", "width=440,height=640");
    if (!popup) return reject(new Error("Popup blocked. Allow popups for this site."));

    const handler = (e: MessageEvent) => {
      if (e.origin !== "https://albedo.link") return;
      window.removeEventListener("message", handler);
      popup.close();
      resolve(e);
    };
    window.addEventListener("message", handler);

    setTimeout(() => {
      window.removeEventListener("message", handler);
      popup.close();
      reject(new Error("Albedo timed out"));
    }, 120000);
  });
}

async function albedoConnect(): Promise<string> {
  const event = await albedoPopup("https://albedo.link/authenticate");
  if (event.data?.pubkey) return event.data.pubkey;
  throw new Error(event.data?.error || "Albedo connection failed");
}

async function albedoSign(xdr: string, pubkey: string): Promise<string> {
  const encoded = encodeURIComponent(xdr);
  const event = await albedoPopup(
    `https://albedo.link/sign?xdr=${encoded}&pubkey=${pubkey}&network=testnet`
  );
  if (event.data?.signed_envelope_xdr) return event.data.signed_envelope_xdr;
  throw new Error(event.data?.error || "Albedo signing failed");
}

// --------------- Context ---------------
interface WalletState {
  connected: boolean;
  publicKey: string | null;
  walletType: WalletType | null;
  connect: (type: WalletType) => Promise<void>;
  disconnect: () => void;
  signXdr: (xdr: string, networkPassphrase?: string) => Promise<string>;
}

const WalletContext = createContext<WalletState>({
  connected: false,
  publicKey: null,
  walletType: null,
  connect: async () => {},
  disconnect: () => {},
  signXdr: async () => "",
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [walletType, setWalletType] = useState<WalletType | null>(null);

  const connect = useCallback(async (type: WalletType) => {
    try {
      let pk = "";

      if (type === "freighter" || type === "xbull" || type === "rabet") {
        const conn = await freighterIsConnected();
        if (!conn.isConnected) throw new Error(`${getWalletName(type)} not detected. Make sure it's installed and unlocked.`);
        const access = await requestAccess();
        if (access.error) throw new Error(String(access.error));
        const addr = await freighterGetAddress();
        pk = addr.address;
      } else if (type === "albedo") {
        pk = await albedoConnect();
      } else if (type === "lobstr") {
        throw new Error("LOBSTR is a mobile wallet. Use WalletConnect or open the app on mobile.");
        throw new Error(`${getWalletName(type)} integration coming soon. Use Freighter or Albedo.`);
      }

      setPublicKey(pk);
      setWalletType(type);
      setConnected(true);
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

      if (walletType === "freighter" || walletType === "xbull" || walletType === "rabet") {
        const result = await freighterSign(xdr, {
          networkPassphrase: passphrase,
          address: publicKey,
        });
        if (result.error) throw new Error(String(result.error));
        if (!result.signedTxXdr) throw new Error("Signing returned no result");
        return result.signedTxXdr;
      }

      if (walletType === "albedo") {
        return albedoSign(xdr, publicKey);
      }

      throw new Error(`Signing not supported for ${walletType}`);
    },
    [connected, publicKey, walletType]
  );

  return (
    <WalletContext.Provider value={{ connected, publicKey, walletType, connect, disconnect, signXdr }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
