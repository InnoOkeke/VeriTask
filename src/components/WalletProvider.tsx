"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import {
  StellarWalletsKit,
  KitEventType,
  ModuleType,
  type ModuleInterface,
  type ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import {
  isConnected as freighterIsConnected,
  requestAccess,
  getAddress as freighterGetAddress,
  signTransaction as freighterSign,
} from "@stellar/freighter-api";

const FREIGHTER_ID = "freighter";
const ALBEDO_ID = "albedo";

const freighterModule: ModuleInterface = {
  moduleType: ModuleType.HOT_WALLET,
  productId: FREIGHTER_ID,
  productName: "Freighter",
  productUrl: "https://freighter.app",
  productIcon: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><rect width='128' height='128' rx='24' fill='%23FF9900'/><text x='64' y='90' font-size='80' text-anchor='middle' fill='white'>F</text></svg>",
  isAvailable: async () => {
    try {
      const result = await freighterIsConnected();
      return result.isConnected;
    } catch {
      return false;
    }
  },
  getAddress: async () => {
    await requestAccess();
    const addr = await freighterGetAddress();
    return { address: addr.address };
  },
  signTransaction: async (xdr, opts) => {
    const result = await freighterSign(xdr, {
      networkPassphrase: opts?.networkPassphrase,
      address: opts?.address,
      path: opts?.path,
    });
    return { signedTxXdr: result.signedTxXdr, signerAddress: result.signerAddress };
  },
  signAuthEntry: async () => ({ signedAuthEntry: "", signerAddress: "" }),
  signMessage: async () => ({ signedMessage: "", signerAddress: "" }),
};

const albedoPopup = (url: string): Promise<MessageEvent> =>
  new Promise((resolve, reject) => {
    const popup = window.open(url, "albedo", "width=440,height=640");
    if (!popup) return reject(new Error("Popup blocked"));
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
      reject(new Error("Timeout"));
    }, 120000);
  });

const albedoModule: ModuleInterface = {
  moduleType: ModuleType.HOT_WALLET,
  productId: ALBEDO_ID,
  productName: "Albedo",
  productUrl: "https://albedo.link",
  productIcon: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><rect width='128' height='128' rx='24' fill='%23FFD700'/><text x='64' y='90' font-size='80' text-anchor='middle' fill='white'>A</text></svg>",
  isAvailable: async () => true,
  getAddress: async () => {
    const e = await albedoPopup("https://albedo.link/authenticate");
    if (e.data?.pubkey) return { address: e.data.pubkey };
    throw new Error(e.data?.error || "Albedo connection failed");
  },
  signTransaction: async (xdr, opts) => {
    const encoded = encodeURIComponent(xdr);
    const pubkey = opts?.address || "";
    const e = await albedoPopup(
      `https://albedo.link/sign?xdr=${encoded}&pubkey=${pubkey}&network=testnet`
    );
    if (e.data?.signed_envelope_xdr) return { signedTxXdr: e.data.signed_envelope_xdr };
    throw new Error(e.data?.error || "Albedo signing failed");
  },
  signAuthEntry: async () => ({ signedAuthEntry: "", signerAddress: "" }),
  signMessage: async () => ({ signedMessage: "", signerAddress: "" }),
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

export const useWallet = () => {
  const context = useContext(WalletContext);

  const connectWallet = useCallback(async () => {
    StellarWalletsKit.init({
      modules: [freighterModule, albedoModule],
    });

    const result = await StellarWalletsKit.authModal();
    const name = StellarWalletsKit.selectedModule?.productName || "Unknown Wallet";
    context.setWalletInfo(result.address, name);
  }, [context]);

  const disconnectWallet = useCallback(async () => {
    await StellarWalletsKit.disconnect();
    context.clearWalletInfo();
  }, [context]);

  const signTransaction = useCallback(
    async (unsignedTransaction: string, address: string): Promise<string> => {
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(
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
