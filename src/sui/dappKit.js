import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { getSuiNetwork } from '../config/suiNetwork';

const defaultNetwork = getSuiNetwork();

function grpcBaseUrl(network) {
  if (network === 'mainnet') return 'https://fullnode.mainnet.sui.io:443';
  if (network === 'testnet') return 'https://fullnode.testnet.sui.io:443';
  return 'https://fullnode.devnet.sui.io:443';
}

/**
 * Wallet RPC follows `VITE_SUI_NETWORK` (devnet | testnet | mainnet).
 * Use mainnet only when you are ready for real assets — same network must be set on the API (`SUI_NETWORK`).
 */
export const dAppKit = createDAppKit({
  networks: ['devnet', 'testnet', 'mainnet'],
  defaultNetwork: defaultNetwork,
  createClient: (network) =>
    new SuiGrpcClient({
      network,
      baseUrl: grpcBaseUrl(network),
    }),
});
