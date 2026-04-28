const ALLOWED = new Set(['devnet', 'testnet', 'mainnet']);

/** Must match backend `SUI_NETWORK` when using on-chain settlement verification. */
export function getSuiNetwork() {
  const raw = import.meta.env.VITE_SUI_NETWORK || 'devnet';
  return ALLOWED.has(raw) ? raw : 'devnet';
}

export function suiFaucetUrl() {
  return 'https://faucet.devnet.sui.io/';
}
