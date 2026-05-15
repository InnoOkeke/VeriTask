import {
  StellarWalletsKit,
  defaultModules,
  KitEventType,
  type ISupportedWallet as SupportedWallet,
} from "@creit.tech/stellar-wallets-kit";

export const walletKitModule = {
  StellarWalletsKit,
  defaultModules,
  KitEventType,
};

export type { SupportedWallet };
