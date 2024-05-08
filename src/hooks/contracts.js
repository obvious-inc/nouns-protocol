import React from "react";
import {
  useBlockNumber,
  useReadContract,
  useReadContracts,
  useSimulateContract,
  useWriteContract,
} from "wagmi";
import auctionHouseAbi from "../abis/auction-house-v2-abi.js";
import nounsTokenAbi from "../abis/nouns-token-abi.js";
import descriptorAbi from "../abis/descriptor-v2-abi.js";
import nounsDaoAbi from "../abis/nouns-dao-logic-v4-abi.js";
import nounsDaoNextAbi from "../abis/nouns-dao-logic-next-abi.js";
import delegationTokenAbi from "../abis/delegation-token-abi.js";
import useAddress from "./address.jsx";

const abis = {
  "nouns-token": nounsTokenAbi,
  "nouns-descriptor": descriptorAbi,
  "nouns-auction-house": auctionHouseAbi,
  "nouns-dao": nounsDaoAbi,
  "nouns-dao:next": nounsDaoNextAbi,
  "nouns-delegation-token": delegationTokenAbi,
};

const createContractReader =
  (versionedContractIdentifier) =>
  (functionName, { args = [], watch = false, enabled = true } = {}) => {
    const [contractIdentifier] = versionedContractIdentifier.split(":");
    const address = useAddress(contractIdentifier);
    const { data: blockNumber } = useBlockNumber({ watch });

    const { data, status, error, refetch } = useReadContract({
      address,
      abi: abis[versionedContractIdentifier],
      functionName,
      args,
      query: { enabled: enabled && address != null },
    });

    if (error) console.log(contractIdentifier, functionName, error);

    React.useEffect(() => {
      if (!enabled) return;
      refetch();
    }, [enabled, blockNumber, refetch]);

    return { data, error, status };
  };

const createContractBatchReader =
  (versionedContractIdentifier) =>
  (functionName, { args = [], watch = false, enabled = true } = {}) => {
    const [contractIdentifier] = versionedContractIdentifier.split(":");
    const address = useAddress(contractIdentifier);
    const { data: blockNumber } = useBlockNumber({ watch });

    const { data, refetch, status, error } = useReadContracts({
      contracts: args?.map((a) => ({
        address,
        abi: abis[versionedContractIdentifier],
        functionName,
        args: a,
      })),
      query: { enabled: enabled && address != null },
    });

    if (error) console.log(versionedContractIdentifier, functionName, error);

    React.useEffect(() => {
      if (!enabled || !watch) return;
      refetch();
    }, [enabled, watch, blockNumber, refetch]);

    return {
      data: data?.map((d) => ({ ...d, data: d.result })),
      status,
      error,
    };
  };

const createContractWriter =
  (versionedContractIdentifier) =>
  (
    functionName,
    { enabled: enabled_ = true, watch = false, ...options } = {},
  ) => {
    const [contractIdentifier] = versionedContractIdentifier.split(":");
    const address = useAddress(contractIdentifier);

    const enabled = enabled_ && address != null;

    const { data: blockNumber } = useBlockNumber({ watch, query: { enabled } });

    const {
      data,
      error: simulationError,
      refetch,
    } = useSimulateContract({
      address,
      abi: abis[versionedContractIdentifier],
      functionName,
      ...options,
      query: { enabled },
    });

    const {
      writeContractAsync,
      status,
      error: callError,
      reset,
    } = useWriteContract();

    React.useEffect(() => {
      if (!enabled) return;
      refetch();
      reset();
    }, [enabled, blockNumber, refetch, reset]);

    const error = callError ?? simulationError;

    if (enabled && error != null)
      console.log(contractIdentifier, functionName, error, options);

    if (data?.request == null) return { status, error };

    return {
      call: () => writeContractAsync(data.request),
      status,
      error,
    };
  };

export const useNounsTokenWrite = createContractWriter("nouns-token");
export const useNounsTokenRead = createContractReader("nouns-token");
export const useNounsTokenReads = createContractBatchReader("nouns-token");

export const useDescriptorRead = createContractReader("nouns-descriptor");

export const useAuctionHouseWrite = createContractWriter("nouns-auction-house");
export const useAuctionHouseRead = createContractReader("nouns-auction-house");
export const useAuctionHouseReads = createContractBatchReader(
  "nouns-auction-house",
);

export const useNounsDaoWrite = createContractWriter("nouns-dao");
export const useNounsDaoRead = createContractReader("nouns-dao");
export const useNounsDaoReads = createContractBatchReader("nouns-dao");

export const useDelegationTokenWrite = createContractWriter(
  "nouns-delegation-token",
);
export const useDelegationTokenRead = createContractReader(
  "nouns-delegation-token",
);
export const useDelegationTokenReads = createContractBatchReader(
  "nouns-delegation-token",
);

export const useNounsDaoNextWrite = createContractWriter("nouns-dao:next");
export const useNounsDaoNextRead = createContractReader("nouns-dao:next");
export const useNounsDaoNextReads = createContractBatchReader("nouns-dao:next");
