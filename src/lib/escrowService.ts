"use client";

import { useWallet } from "@/components/WalletProvider";
import {
  useInitializeEscrow,
  useFundEscrow,
  useApproveMilestone,
  useChangeMilestoneStatus,
  useReleaseFunds,
  useSendTransaction,
  useUpdateEscrow,
  useGetEscrowFromIndexerByContractIds,
} from "@trustless-work/escrow/hooks";
import type {
  InitializeMultiReleaseEscrowPayload,
  InitializeMultiReleaseEscrowResponse,
  FundEscrowPayload,
  ApproveMilestonePayload,
  ChangeMilestoneStatusPayload,
  MultiReleaseReleaseFundsPayload,
} from "@trustless-work/escrow";

export const useEscrowService = () => {
  const { signTransaction } = useWallet();
  const { deployEscrow } = useInitializeEscrow();
  const { fundEscrow } = useFundEscrow();
  const { changeMilestoneStatus } = useChangeMilestoneStatus();
  const { approveMilestone } = useApproveMilestone();
  const { releaseFunds } = useReleaseFunds();
  const { sendTransaction } = useSendTransaction();
  const { updateEscrow } = useUpdateEscrow();
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();

  const handleDeploy = async (payload: InitializeMultiReleaseEscrowPayload): Promise<{ contractId: string; escrow?: Record<string, unknown> }> => {
    const unsigned = await deployEscrow(payload, "multi-release");
    if (!unsigned?.unsignedTransaction) {
      throw new Error(`Escrow API returned no unsigned transaction. Response: ${JSON.stringify(unsigned)}`);
    }
    const signedXdr = await signTransaction(unsigned.unsignedTransaction, payload.signer);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await sendTransaction(signedXdr) as any;
    return {
      contractId: result.contractId as string,
      escrow: result.escrow as Record<string, unknown> | undefined,
    };
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

  const handleUpdateMilestoneReceiver = async (
    contractId: string,
    milestoneIndex: number,
    agentAddress: string,
    signer: string,
    storedEscrowData?: Record<string, unknown>
  ) => {
    const escrowData = storedEscrowData;
    if (!escrowData) throw new Error("No escrow data available — task must have been deployed with escrow data");

    const milestones = [...(escrowData.milestones as Record<string, unknown>[])];
    if (!milestones[milestoneIndex]) throw new Error("Milestone not found");
    milestones[milestoneIndex] = { ...milestones[milestoneIndex], receiver: agentAddress };

    const d = escrowData;
    const cleanEscrow: Record<string, unknown> = {};
    const allowed = ["engagementId", "title", "description", "platformFee", "trustline", "roles", "milestones", "isActive"];
    for (const key of allowed) {
      if (key === "milestones") continue;
      if (d[key] !== undefined) cleanEscrow[key] = d[key];
    }
    cleanEscrow.milestones = milestones;

    const unsigned = await updateEscrow({
      contractId,
      escrow: cleanEscrow,
      signer,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any, "multi-release");
    const signedXdr = await signTransaction(unsigned.unsignedTransaction!, signer);
    return sendTransaction(signedXdr);
  };

  return {
    handleDeploy,
    handleFund,
    handleChangeMilestoneStatus,
    handleApproveMilestone,
    handleReleaseFunds,
    handleUpdateMilestoneReceiver,
  };
};
