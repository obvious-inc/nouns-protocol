import { isAddress } from "viem";
import React from "react";
import { mainnet, sepolia } from "wagmi/chains";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useConnectors,
} from "wagmi";
import {
  DEFAULT_MAINNET_NOUNS_TOKEN_ADDRESS,
  DEFAULT_SEPOLIA_NOUNS_TOKEN_ADDRESS,
} from "./constants.js";
import useContractAddress, {
  Provider as ContractAddressProvider,
} from "./hooks/address.jsx";
import AccountDisplayName from "./components/account-display-name.jsx";
import EtherscanLink from "./components/etherscan-link.jsx";

const NounsDao = React.lazy(() => import("./components/nouns-dao.jsx"));
const NounsDaoNext = React.lazy(
  () => import("./components/nouns-dao-next.jsx"),
);
const AuctionHouse = React.lazy(() => import("./components/auction-house.jsx"));
const NounsToken = React.lazy(() => import("./components/nouns-token.jsx"));
const DelegationToken = React.lazy(
  () => import("./components/delegation-token.jsx"),
);

const App = () => {
  const [contractIdentifier, setContractIdentifier] = React.useState(() => {
    const customInitialIdentifier = new URLSearchParams(location.search).get(
      "contract",
    );
    return customInitialIdentifier ?? "nouns-auction-house";
  });

  const selectedContractAddress = useContractAddress(contractIdentifier);

  const delegationTokenAddress = useContractAddress("nouns-delegation-token");

  const isNounsGovernor = delegationTokenAddress != null;

  return (
    <>
      <Header />
      <main style={{ marginTop: "3.2rem" }}>
        {selectedContractAddress != null && (
          <>
            <label htmlFor="contract">Contract</label>
            <select
              id="contract"
              value={contractIdentifier}
              onChange={(e) => {
                const searchParams = new URLSearchParams(location.search);
                searchParams.set("contract", e.target.value);
                history.replaceState(
                  null,
                  null,
                  `${location.pathname}?${searchParams}`,
                );
                setContractIdentifier(e.target.value);
              }}
              style={{ width: "100%" }}
            >
              {[
                { value: "nouns-auction-house", label: "Auction House" },
                { value: "nouns-token", label: "Nouns Token" },
                { value: "nouns-dao", label: "DAO" },
                isNounsGovernor
                  ? {
                      value: "nouns-delegation-token",
                      label: "Delegation token",
                    }
                  : null,
              ]
                .filter(Boolean)
                .map((o) => (
                  <option key={o.value} value={o.value} disabled={o.disabled}>
                    {o.label}
                  </option>
                ))}
            </select>
            <p data-small data-compact>
              <EtherscanLink
                address={selectedContractAddress}
                data-dimmed
                style={{ textDecoration: "none" }}
              >
                {selectedContractAddress}
              </EtherscanLink>
            </p>

            <React.Suspense fallback={null}>
              <div style={{ padding: "3.2rem 0 0" }}>
                {(() => {
                  switch (contractIdentifier) {
                    case "nouns-dao":
                      return isNounsGovernor ? <NounsDaoNext /> : <NounsDao />;
                    case "nouns-auction-house":
                      return <AuctionHouse />;
                    case "nouns-token":
                      return (
                        <NounsToken
                          context={
                            isNounsGovernor ? "nouns-governor" : "default"
                          }
                        />
                      );
                    case "nouns-delegation-token":
                      return <DelegationToken />;
                    default:
                      throw new Error();
                  }
                })()}
              </div>
            </React.Suspense>
          </>
        )}
      </main>
    </>
  );
};

const Header = () => {
  const { address, chain, chainId, isConnected, isConnecting } = useAccount();
  const { connect } = useConnect();
  const connectors = useConnectorsWithReadyState();
  const { disconnect } = useDisconnect();

  const [selectedConnectorId, setSelectedConnectorId] = React.useState(null);

  return (
    <>
      <h1 style={{ margin: 0 }}>Nouns Protocol</h1>
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "1.6rem",
          marginTop: "0.8rem",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {isConnected && (
            <small>
              Connected to{" "}
              <em>
                {chain == null ? `${chainId} (unsupported chain)` : chain.name}
              </em>{" "}
              as{" "}
              <em>
                <EtherscanLink address={address}>
                  <AccountDisplayName address={address} />
                </EtherscanLink>
              </em>
            </small>
          )}
        </div>
        {isConnected ? (
          <button data-small onClick={() => disconnect()}>
            Disconnect
          </button>
        ) : (
          <div style={{ display: "flex", gap: "0.8rem" }}>
            <select
              data-small
              value={selectedConnectorId ?? ""}
              onChange={(e) => {
                setSelectedConnectorId(e.target.value);
              }}
            >
              <option value="" disabled>
                Select connector
              </option>
              {connectors.map((c) => (
                <option key={c.id} value={c.id} disabled={!c.ready}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              data-small
              onClick={() => {
                const connector = connectors.find(
                  (c) => c.id === selectedConnectorId,
                );
                connect({ connector });
              }}
              disabled={isConnecting || selectedConnectorId == null}
            >
              Connect
            </button>
          </div>
        )}
      </header>
    </>
  );
};

const useConnectorsWithReadyState = () => {
  const connectors = useConnectors();
  const [readyConnectorIds, setReadyConnectorIds] = React.useState([]);

  React.useEffect(() => {
    let canceled = false;

    Promise.all(
      connectors.map(async (c) => {
        const p = await c.getProvider();
        if (p == null) return c;
        return { ...c, ready: true };
      }),
    ).then((connectorsWithReadyState) => {
      if (canceled) return;

      const readyConnectorIds = connectorsWithReadyState
        .filter((c) => c.ready)
        .map((c) => c.id);

      setReadyConnectorIds(readyConnectorIds);
    });

    return () => {
      canceled = true;
    };
  }, [connectors]);

  return React.useMemo(
    () =>
      connectors
        .map((c) => {
          if (!readyConnectorIds.includes(c.id)) return c;
          return { ...c, ready: true };
        })
        .filter((c) => {
          // Exclude the injected and safe connectors if they’re not available
          // (safe only runs in iframe contexts)
          const hideIfUnavailable = c.id === "injected" || c.id === "safe";
          return c.ready || !hideIfUnavailable;
        }),
    [connectors, readyConnectorIds],
  );
};

export default function Root() {
  const chainId = useChainId();

  const customNounsAddress = new URLSearchParams(location.search).get(
    "nouns-token",
  );

  const defaultNounsAddress = {
    [mainnet.id]: DEFAULT_MAINNET_NOUNS_TOKEN_ADDRESS,
    [sepolia.id]: DEFAULT_SEPOLIA_NOUNS_TOKEN_ADDRESS,
  }[chainId];

  return (
    <ContractAddressProvider
      nounsAddress={
        isAddress(customNounsAddress) ? customNounsAddress : defaultNounsAddress
      }
    >
      <App />
    </ContractAddressProvider>
  );
}
