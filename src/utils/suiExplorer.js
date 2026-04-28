import { getSuiNetwork } from '../config/suiNetwork';

/**
 * Sui explorer URL for a transaction digest.
 * @param {string} digest
 * @param {'devnet' | 'mainnet' | 'testnet'} [network] defaults to `VITE_SUI_NETWORK`
 */
export function suiTxExplorerUrl(digest, network) {
  if (!digest || typeof digest !== 'string') return null;
  const n = network || getSuiNetwork();
  return `https://suiexplorer.com/txblock/${encodeURIComponent(digest.trim())}?network=${n}`;
}
