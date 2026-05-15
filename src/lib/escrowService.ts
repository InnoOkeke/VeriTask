"use client";

import { useWallet } from "@/components/WalletProvider";
import {
  useInitializeEscrow,
  useFundEscrow,
  useApproveMilestone,
  useChangeMilestoneStatus,
  useReleaseFunds,
  useSendTransaction,
} from "@trustless-work/escrow/hooks";
import type {
  InitializeMultiReleaseEscrowPayload,
  InitializeMultiReleaseEscrowResponse,
  FundEscrowPayload,
  ApproveMilestonePayload,
  ChangeMilestoneStatusPayload,
  MultiReleaseReleaseFundsPayload,
} from "@trustless-work/escrow";
import { Account, Asset, Operation, TransactionBuilder, Networks } from "@stellar/stellar-sdk";

const HORIZON = "https://horizon-testnet.stellar.org";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export const useEscrowService = () => {
  const { signTransaction } = useWallet();
  const { deployEscrow } = useInitializeEscrow();
  const { fundEscrow } = useFundEscrow();
  const { changeMilestoneStatus } = useChangeMilestoneStatus();
  const { approveMilestone } = useApproveMilestone();
  const { releaseFunds } = useReleaseFunds();
  const { sendTransaction } = useSendTransaction();

  const handleDeploy = async (payload: InitializeMultiReleaseEscrowPayload): Promise<InitializeMultiReleaseEscrowResponse> => {
    const unsigned = await deployEscrow(payload, "multi-release");
    if (!unsigned?.unsignedTransaction) {
      throw new Error(`Escrow API returned no unsigned transaction. Response: ${JSON.stringify(unsigned)}`);
    }
    const signedXdr = await signTransaction(unsigned.unsignedTransaction, payload.signer);
    const result = await sendTransaction(signedXdr) as InitializeMultiReleaseEscrowResponse;
    return result;
  };

  const handleFund = async (payload: FundEscrowPayload) => {
    const unsigned = await fundEscrow(payload, "multi-release");
    const signedXdr = await signTransaction(unsigned.unsignedTransaction!, payload.signer);
    return sendTransaction(signedXdr);
  };

  const handleChangeMilestoneStatus = async (payload: ChangeMilestoneStatusPayload) => {
    const unsigned = await changeMilestoneStatus(payload, "multi-release");
    const signedXdr = await signTransaction(unsigned.unsignedTransaction!, payload.serviceProvider);
    return sendTransaction(signedXdr);
  };

  const handleApproveMilestone = async (payload: ApproveMilestonePayload) => {
    const unsigned = await approveMilestone(payload, "multi-release");
    const signedXdr = await signTransaction(unsigned.unsignedTransaction!, payload.approver);
    return sendTransaction(signedXdr);
  };

  const handleReleaseFunds = async (payload: MultiReleaseReleaseFundsPayload) => {
    const unsigned = await releaseFunds(payload, "multi-release");
    const signedXdr = await signTransaction(unsigned.unsignedTransaction!, payload.releaseSigner);
    return sendTransaction(signedXdr);
  };

  const handleForwardPayment = async (fromAddress: string, toAddress: string, amount: string) => {
    const resp = await fetch(`${HORIZON}/accounts/${fromAddress}`);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || err.title || "Failed to fetch account");
    }
    const accountData = await resp.json();

    const usdcBalance = accountData.balances?.find(
      (b: Record<string, unknown>) => b.asset_code === "USDC" && b.asset_issuer === USDC_ISSUER
    );
    const balance = parseFloat((usdcBalance?.balance as string) || "0");
    if (balance < parseFloat(amount)) {
      throw new Error(`Insufficient USDC balance: ${balance} available, ${amount} needed`);
    }

    const account = new Account(accountData.account_id, accountData.sequence);

    const tx = new TransactionBuilder(account, {
      fee: "10000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: toAddress,
          asset: new Asset("USDC", USDC_ISSUER),
          amount,
        })
      )
      .setTimeout(30)
      .build();

    const signedXdr = await signTransaction(tx.toXDR(), fromAddress);

    const submitResp = await fetch(`${HORIZON}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `tx=${encodeURIComponent(signedXdr)}`,
    });
    const submitJson = await submitResp.json();
    if (!submitResp.ok) {
      throw new Error(submitJson.extras?.result_codes?.transaction || submitJson.detail || submitJson.title || "Payment failed");
    }
    return submitJson;
  };

  return {
    handleDeploy,
    handleFund,
    handleChangeMilestoneStatus,
    handleApproveMilestone,
    handleReleaseFunds,
    handleForwardPayment,
  };
};
