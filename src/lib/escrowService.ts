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

  const handleDeploy = async (payload: InitializeMultiReleaseEscrowPayload): Promise<InitializeMultiReleaseEscrowResponse> => {
    const unsigned = await deployEscrow(payload, "multi-release");
    if (!unsigned?.unsignedTransaction) {
      throw new Error(`Escrow API returned no unsigned transaction. Response: ${JSON.stringify(unsigned)}`);
    }
    const signedXdr = await signTransaction(unsigned.unsignedTransaction, payload.signer);
    const result = await sendTransaction(signedXdr);
    return result as InitializeMultiReleaseEscrowResponse;
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
    signer: string
  ) => {
    const result = await getEscrowByContractIds({
      contractIds: [contractId],
      validateOnChain: true,
    });
    const escrowData = Array.isArray(result) ? result[0] : result;
    if (!escrowData) throw new Error("Escrow not found on-chain");

    const milestones = [...(escrowData.milestones as Record<string, unknown>[])];
    if (!milestones[milestoneIndex]) throw new Error("Milestone not found");
    milestones[milestoneIndex] = { ...milestones[milestoneIndex], receiver: agentAddress };

    const unsigned = await updateEscrow({
      contractId,
      escrow: { ...escrowData, milestones },
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
