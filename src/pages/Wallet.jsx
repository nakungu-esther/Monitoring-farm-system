import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDAppKit, useCurrentAccount, useCurrentClient, useWalletConnection } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { Transaction } from '@mysten/sui/transactions';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { dAppKit } from '../sui/dappKit';
import { isLikelySuiAddress } from '../utils/suiAddress';
import { getSuiNetwork, suiFaucetUrl } from '../config/suiNetwork';
import {
  SLUSH_APP_URL,
  SLUSH_CHROME_STORE_URL,
  SLUSH_CONNECT_GUIDE_URL,
} from '../config/suiWallets';
import { suiTxExplorerUrl } from '../utils/suiExplorer';
import { isNonEmptyTrimmed, isPositiveFinite } from '../utils/authValidation';
import { Copy, Send, Inbox, Unplug } from 'lucide-react';

export default function Wallet() {
  const {
    wallet,
    connectWalletMock,
    disconnectWallet,
    sendSUIMock,
    receiveSUIMock,
    visibleSales,
    linkSalePayment,
    createEscrowMock,
    releaseEscrowMock,
    escrows,
    walletTransactions,
    currentUser,
    creditOwedAsBuyer,
    allUsers,
    recordOnchainDevnetPayment,
  } = useAgriTrack();
  const { toast } = useToast();

  const sui = useDAppKit();
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const walletConn = useWalletConnection();

  const [devBalanceMist, setDevBalanceMist] = useState(null);
  const [devPaySaleId, setDevPaySaleId] = useState('');
  const [devPaySui, setDevPaySui] = useState('0.01');
  const [devPayBusy, setDevPayBusy] = useState(false);

  const suiNet = getSuiNetwork();

  useEffect(() => {
    const addr = account?.address;
    if (!client || !addr) {
      setDevBalanceMist(null);
      return;
    }
    let cancelled = false;
    client
      .getBalance({ owner: addr })
      .then((res) => {
        if (cancelled) return;
        const raw = res?.balance?.coinBalance ?? res?.balance?.balance ?? '0';
        setDevBalanceMist(BigInt(raw));
      })
      .catch(() => {
        if (!cancelled) setDevBalanceMist(null);
      });
    return () => {
      cancelled = true;
    };
  }, [client, account?.address]);

  const payables = useMemo(() => {
    if (currentUser?.role !== 'trader') return [];
    return creditOwedAsBuyer.filter((s) => {
      const out = s.totalPayment - (s.amountPaid || 0);
      return out > 0 && (s.paymentStatus === 'credit' || s.paymentStatus === 'partial');
    });
  }, [creditOwedAsBuyer, currentUser?.role]);

  const onDevnetPayFarmer = useCallback(async () => {
    if (!walletConn.isConnected || !account?.address) {
      toast(`Connect your wallet first (e.g. Slush) on ${suiNet}.`, 'warn');
      return;
    }
    if (!devPaySaleId) {
      toast('Select a sale with an outstanding balance.', 'warn');
      return;
    }
    const sale = payables.find((s) => s.id === devPaySaleId);
    if (!sale) {
      toast('Sale not found or already settled.', 'warn');
      return;
    }
    const farmer = allUsers?.find((u) => u.id === sale.userId);
    const recipient = farmer?.profile?.suiAddress?.trim();
    if (!isLikelySuiAddress(recipient)) {
      toast(
        `Farmer must save a valid ${suiNet} Sui address on Profile (0x + hex).`,
        'error',
      );
      return;
    }
    if (!isPositiveFinite(devPaySui)) {
      toast('Enter amount in SUI (e.g. 0.01).', 'warn');
      return;
    }
    const suiN = Number(devPaySui);
    const mist = BigInt(Math.round(suiN * 1e9));
    setDevPayBusy(true);
    try {
      const tx = new Transaction();
      const [sendCoin] = tx.splitCoins(tx.gas, [mist]);
      tx.transferObjects([sendCoin], recipient);
      const result = await sui.signAndExecuteTransaction({ transaction: tx });
      if (result.$kind === 'FailedTransaction') {
        const msg = result.FailedTransaction?.status?.error ?? 'Transaction failed';
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
      const digest = result.Transaction?.digest;
      if (!digest) throw new Error('No transaction digest returned.');
      const r = await recordOnchainDevnetPayment(sale.id, {
        digest,
        mist: Number(mist),
        sender: account.address,
        recipient,
      });
      if (!r.ok) {
        toast(r.error || 'Could not update sale after payment.', 'error');
        return;
      }
      toast(`${suiNet} payment confirmed — digest ${digest.slice(0, 10)}…`);
      setDevPaySaleId('');
    } catch (e) {
      toast(e?.message || 'Sui transaction failed', 'error');
    } finally {
      setDevPayBusy(false);
    }
  }, [
    walletConn.isConnected,
    account?.address,
    devPaySaleId,
    devPaySui,
    payables,
    allUsers,
    sui,
    recordOnchainDevnetPayment,
    toast,
    suiNet,
  ]);

  const [sendOpen, setSendOpen] = useState(false);
  const [recvOpen, setRecvOpen] = useState(false);
  const [send, setSend] = useState({ to: '', amount: '', memo: '' });
  const [recv, setRecv] = useState({ from: '', amount: '', memo: '' });
  const [linkSaleId, setLinkSaleId] = useState('');
  const [linkAmt, setLinkAmt] = useState('');
  const [linkSettleUgx, setLinkSettleUgx] = useState(true);
  const [escSaleId, setEscSaleId] = useState('');
  const [escAmt, setEscAmt] = useState('');
  const [qrAmountSui, setQrAmountSui] = useState('');

  const qrPayload =
    wallet.connected && wallet.address
      ? JSON.stringify({
          app: 'agritrack',
          chain: 'sui-mock',
          to: wallet.address,
          amountSUI: qrAmountSui ? Number(qrAmountSui) : null,
          memo: 'Scan to pay farmer (mock)',
        })
      : '';

  const qrUrl = qrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrPayload)}`
    : '';

  const onSend = (e) => {
    e.preventDefault();
    if (!isNonEmptyTrimmed(send.to)) {
      toast('Enter a recipient address or name.', 'warn');
      return;
    }
    if (!isPositiveFinite(send.amount)) {
      toast('Enter a valid SUI amount greater than zero.', 'warn');
      return;
    }
    const r = sendSUIMock(send.to, send.amount, send.memo);
    if (r.ok) {
      toast('Transfer sent');
      setSendOpen(false);
      setSend({ to: '', amount: '', memo: '' });
    } else {
      toast(r.error || 'Send failed', 'error');
    }
  };

  const onSubmitRecv = (e) => {
    e.preventDefault();
    if (!isNonEmptyTrimmed(recv.from)) {
      toast('Enter who sent the payment.', 'warn');
      return;
    }
    if (!isPositiveFinite(recv.amount)) {
      toast('Enter a valid SUI amount greater than zero.', 'warn');
      return;
    }
    receiveSUIMock(recv.from, recv.amount, recv.memo);
    toast('Incoming payment recorded');
    setRecvOpen(false);
    setRecv({ from: '', amount: '', memo: '' });
  };

  const txs = [...walletTransactions].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, 14);

  const devBalLabel =
    devBalanceMist == null
      ? '—'
      : `${(Number(devBalanceMist) / 1e9).toFixed(4)} SUI`;

  const networkLead =
    suiNet === 'mainnet'
      ? 'Mainnet — real SUI. The API must use SUI_NETWORK=mainnet so payment digests are verified against the same chain. Mock wallet below is still UI-only.'
      : suiNet === 'testnet'
        ? 'Testnet — use test SUI only. Point the API at testnet (SUI_NETWORK=testnet). Mock wallet below is optional when offline.'
        : 'Devnet — free test SUI via the faucet. Mock wallet below is optional when not using a browser wallet.';

  return (
    <div className="page wallet-page">
      <p className="page-lead muted">
        <strong>{suiNet}</strong>
        {' · '}
        {networkLead}
      </p>

      <section className="panel card-like" style={{ marginBottom: '1.5rem' }}>
        <h2 className="panel-heading">
          Sui —
          {suiNet}
        </h2>
        <p className="muted small">
          {suiNet === 'devnet' ? (
            <>
              Get test SUI:{' '}
              <a href={suiFaucetUrl()} target="_blank" rel="noreferrer">
                faucet.devnet.sui.io
              </a>
              .
            </>
          ) : suiNet === 'testnet' ? (
            <>
              Testnet faucet:{' '}
              <a href="https://faucet.testnet.sui.io/" target="_blank" rel="noreferrer">
                faucet.testnet.sui.io
              </a>
              .
            </>
          ) : (
            <>No faucet on mainnet — acquire SUI from an exchange or peer, then send from your wallet.</>
          )}
          {' '}
          Explorer:{' '}
          <a
            href={`https://suiexplorer.com/?network=${encodeURIComponent(suiNet)}`}
            target="_blank"
            rel="noreferrer"
          >
            suiexplorer.com (
            {suiNet}
            )
          </a>
          .
        </p>
        <div className="wallet-actions-row" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <ConnectButton instance={dAppKit} />
        </div>
        <div
          className="muted small"
          style={{
            marginTop: '0.85rem',
            padding: '0.75rem 1rem',
            borderRadius: 12,
            border: '1px solid var(--border, #e2e8f0)',
            background: 'var(--card-bg-muted, #f8fafc)',
            lineHeight: 1.5,
          }}
        >
          <strong>Slush (recommended):</strong>{' '}
          <a href={SLUSH_CHROME_STORE_URL} target="_blank" rel="noreferrer">
            browser extension
          </a>
          {' · '}
          <a href={SLUSH_APP_URL} target="_blank" rel="noreferrer">
            my.slush.app
          </a>
          {'. '}
          In Slush, switch the network to <strong>{suiNet}</strong> (must match{' '}
          <code className="text-xs">VITE_SUI_NETWORK</code>
          ).{' '}
          <a href={SLUSH_CONNECT_GUIDE_URL} target="_blank" rel="noreferrer">
            How to connect to apps
          </a>
          . The button above should list Slush when the extension is installed; otherwise use another Sui wallet on the
          same network.
        </div>
        {walletConn.isConnected && account?.address ? (
          <div className="wallet-balance-card" style={{ marginTop: '1rem' }}>
            <div className="wallet-balance-label">
              Connected address ·
              {suiNet}
              {' '}
              balance
            </div>
            <div className="wallet-addr-row">
              <code className="wallet-addr">{account.address}</code>
              <button
                type="button"
                className="btn-ghost sm inline-flex items-center justify-center p-1.5"
                title="Copy address"
                aria-label="Copy address"
                onClick={() => {
                  navigator.clipboard?.writeText(account.address);
                  toast('Address copied');
                }}
              >
                <Copy className="size-4" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div className="wallet-balance-num">
              <span className="wallet-sui-val">{devBalLabel}</span>
            </div>
          </div>
        ) : (
          <p className="small muted" style={{ marginTop: '0.75rem' }}>
            Install <strong>Slush</strong> (or another Sui wallet), set network to <strong>{suiNet}</strong>, then
            connect.
          </p>
        )}

        {currentUser?.role === 'trader' && payables.length > 0 ? (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: '1rem' }}>
            <h3 className="panel-heading sm">Pay farmer on-chain (trader)</h3>
            <p className="muted small">
              Choose an open credit line. The farmer’s <strong>Sui address</strong> comes from their Profile. After the
              tx succeeds, we save the <strong>digest</strong> and mark the sale <strong>paid</strong> in UGX on your ledger.
            </p>
            <div className="inline-tools" style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <select
                value={devPaySaleId}
                onChange={(e) => setDevPaySaleId(e.target.value)}
                className="select-inline"
              >
                <option value="">Select sale…</option>
                {payables.map((s) => {
                  const farmer = allUsers?.find((u) => u.id === s.userId);
                  const name = farmer?.profile?.name || 'Farmer';
                  return (
                    <option key={s.id} value={s.id}>
                      {name} — {s.produceName} (balance UGX
                      {' '}
                      {(s.totalPayment - (s.amountPaid || 0)).toLocaleString()})
                    </option>
                  );
                })}
              </select>
              <input
                type="number"
                step="0.001"
                className="input-inline"
                placeholder="SUI"
                value={devPaySui}
                onChange={(e) => setDevPaySui(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary"
                disabled={!walletConn.isConnected || devPayBusy}
                onClick={() => onDevnetPayFarmer()}
              >
                {devPayBusy ? 'Signing…' : `Sign & pay (${suiNet})`}
              </button>
            </div>
          </div>
        ) : currentUser?.role === 'farmer' ? (
          <p className="small muted" style={{ marginTop: '1rem' }}>
            Add your <strong>{suiNet} Sui address</strong> under <strong>Profile</strong> so traders can pay you on-chain.
            Copy it from <a href={SLUSH_APP_URL} target="_blank" rel="noreferrer">
              Slush
            </a>
            .
          </p>
        ) : null}

        <div
          className="small muted"
          style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border, #e2e8f0)',
          }}
        >
          <strong>Withdraw (cash out SUI):</strong> this app does not hold tokens. In AgriTrack, on-chain sale amounts go
          to the <strong>farmer address</strong> on Profile (seller), not to admin. Open{' '}
          <a href={SLUSH_APP_URL} target="_blank" rel="noreferrer">
            Slush
          </a>{' '}
          (or your exchange), use <strong>Send</strong> from that Sui address to a CEX deposit or another wallet. Traders
          spend <em>from</em> the wallet connected on this page. An admin account does not automatically receive
          payment — only a Profile address you set does.
        </div>
      </section>

      <h2 className="panel-heading">Mock wallet (offline)</h2>
      <p className="muted small" style={{ marginBottom: '1rem' }}>
        In-app balances only — not on-chain. For use without a browser extension.
      </p>

      {!wallet.connected ? (
        <div className="wallet-hero card-like">
          <EmptyState
            icon="💳"
            title="Connect mock wallet"
            hint="One tap to generate a mock address and balance."
          />
          <button
            type="button"
            className="btn-primary wallet-connect"
            onClick={() => {
              connectWalletMock();
              toast('Mock wallet connected');
            }}
          >
            Connect mock wallet
          </button>
        </div>
      ) : (
        <>
          <div className="wallet-balance-card">
            <div className="wallet-balance-label">Mock balance</div>
            <div className="wallet-balance-num">
              <span className="wallet-sui-val">{wallet.balanceSUI}</span>
              <span className="wallet-sui-unit">SUI</span>
            </div>
            <div className="wallet-addr-row">
              <code className="wallet-addr">{wallet.address}</code>
              <button
                type="button"
                className="btn-ghost sm inline-flex items-center justify-center p-1.5"
                title="Copy address"
                aria-label="Copy address"
                onClick={() => {
                  navigator.clipboard?.writeText(wallet.address);
                  toast('Address copied');
                }}
              >
                <Copy className="size-4" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div className="wallet-actions-row flex flex-wrap items-center gap-1">
              <button
                type="button"
                className="btn-wallet send inline-flex items-center justify-center gap-1.5"
                title="Send"
                aria-label="Send"
                onClick={() => setSendOpen(true)}
              >
                <Send className="size-4 shrink-0" strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                className="btn-wallet recv inline-flex items-center justify-center gap-1.5"
                title="Receive"
                aria-label="Receive"
                onClick={() => setRecvOpen(true)}
              >
                <Inbox className="size-4 shrink-0" strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                className="btn-ghost inline-flex items-center justify-center p-1.5"
                title="Disconnect"
                aria-label="Disconnect"
                onClick={() => { disconnectWallet(); toast('Disconnected'); }}
              >
                <Unplug className="size-4" strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>

          <div className="wallet-qr-card">
            <div>
              <h3 className="panel-heading sm">Receive via QR</h3>
              <p className="muted small">
                Payload encodes your mock address and optional SUI amount (JSON for QR).
              </p>
              <label className="auth-field" style={{ marginTop: '0.5rem' }}>
                <span className="auth-label">Amount on QR (SUI, optional)</span>
                <input
                  type="number"
                  step="0.01"
                  value={qrAmountSui}
                  onChange={(e) => setQrAmountSui(e.target.value)}
                  placeholder="e.g. 10"
                />
              </label>
            </div>
            {qrUrl ? (
              <img src={qrUrl} alt="Payment QR" className="wallet-qr-img" width={180} height={180} />
            ) : null}
          </div>
        </>
      )}

      <section className="panel">
        <h3 className="panel-heading sm">Link mock payment to sale</h3>
        <p className="muted small" style={{ marginTop: '-0.25rem' }}>
          Also mark the sale <strong>paid in UGX</strong> on the ledger when checked — mock only.
        </p>
        <div className="inline-tools">
          <select value={linkSaleId} onChange={(e) => setLinkSaleId(e.target.value)} className="select-inline">
            <option value="">Select sale…</option>
            {visibleSales.map((s) => (
              <option key={s.id} value={s.id}>{s.buyerName} — {s.produceName}</option>
            ))}
          </select>
          <input type="number" step="0.01" placeholder="SUI" value={linkAmt} onChange={(e) => setLinkAmt(e.target.value)} className="input-inline" />
          <label className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={linkSettleUgx}
              onChange={(e) => setLinkSettleUgx(e.target.checked)}
            />
            Settle UGX (paid)
          </label>
          <button
            type="button"
            className="btn-secondary"
            disabled={!wallet.connected}
            onClick={() => {
              const r = linkSalePayment(linkSaleId, linkAmt, { settleUgxFull: linkSettleUgx });
              if (r.ok) {
                toast(linkSettleUgx ? 'Mock SUI linked — sale marked paid in UGX.' : 'Mock SUI linked to sale.');
              } else toast('Pick sale and amount', 'warn');
            }}
          >
            Link
          </button>
        </div>

        <h3 className="panel-heading sm mt-lg">Escrow (pay after delivery, mock)</h3>
        <div className="inline-tools">
          <select value={escSaleId} onChange={(e) => setEscSaleId(e.target.value)} className="select-inline">
            <option value="">Sale…</option>
            {visibleSales.map((s) => (
              <option key={s.id} value={s.id}>{s.buyerName}</option>
            ))}
          </select>
          <input type="number" step="0.01" placeholder="SUI" value={escAmt} onChange={(e) => setEscAmt(e.target.value)} className="input-inline" />
          <button
            type="button"
            className="btn-secondary"
            disabled={!wallet.connected}
            onClick={() => {
              const r = createEscrowMock(escSaleId, escAmt);
              if (r.ok) toast('Funds locked in escrow'); else toast('Check sale & amount', 'warn');
            }}
          >
            Lock escrow
          </button>
        </div>
        <div className="table-wrap mt-md">
          <table className="data-table">
            <thead>
              <tr><th>Sale</th><th>SUI</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {escrows.length === 0 ? (
                <tr><td colSpan={4} className="muted center">No active escrows.</td></tr>
              ) : (
                escrows.map((ev) => (
                  <tr key={ev.id}>
                    <td className="small">{ev.saleId}</td>
                    <td className="tabular">{ev.amountSUI}</td>
                    <td><span className={`badge-status st-${ev.status}`}>{ev.status}</span></td>
                    <td>
                      {ev.status === 'locked' ? (
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => { releaseEscrowMock(ev.id); toast('Released to farmer'); }}
                        >
                          Release
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-heading sm">Activity</h3>
        <div className="table-wrap">
          <table className="data-table striped">
            <thead>
              <tr>
                <th>Kind</th>
                <th>Detail</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 ? (
                <tr><td colSpan={3} className="muted center">No transactions yet.</td></tr>
              ) : (
                txs.map((tx) => (
                  <tr key={tx.id}>
                    <td className="fw-semibold small">
                      {tx.type === 'sui_devnet' ? `Sui · ${suiNet}` : (tx.type || '—')}
                    </td>
                    <td className="small muted">
                      {tx.type === 'sui_devnet' ? (
                        <>
                          <span className="tabular-nums">{tx.mist}</span> MIST
                          <br />
                          <code className="text-xs">{tx.digest}</code>
                          <br />
                          <a
                            className="text-emerald-700"
                            href={suiTxExplorerUrl(tx.digest) || '#'}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View on explorer
                          </a>
                        </>
                      ) : (
                        <>
                          <span className="tabular-nums">{tx.amountSUI}</span> SUI (mock)
                          <br />
                          {tx.from} → {tx.to}
                        </>
                      )}
                    </td>
                    <td><span className="badge-status st-neutral">{tx.status || '—'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal title="Send money (mock)" isOpen={sendOpen} onClose={() => setSendOpen(false)}>
        <form onSubmit={onSend} className="modal-form" noValidate>
          <label className="auth-field">
            <span className="auth-label">Recipient address or label</span>
            <input value={send.to} onChange={(e) => setSend((s0) => ({ ...s0, to: e.target.value }))} placeholder="0x… or name" />
          </label>
          <label className="auth-field">
            <span className="auth-label">Amount (SUI)</span>
            <input type="number" step="0.01" value={send.amount} onChange={(e) => setSend((s0) => ({ ...s0, amount: e.target.value }))} />
          </label>
          <label className="auth-field">
            <span className="auth-label">Note (optional)</span>
            <input value={send.memo} onChange={(e) => setSend((s0) => ({ ...s0, memo: e.target.value }))} />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setSendOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Send</button>
          </div>
        </form>
      </Modal>

      <Modal title="Receive money (mock)" isOpen={recvOpen} onClose={() => setRecvOpen(false)}>
        <form onSubmit={onSubmitRecv} className="modal-form" noValidate>
          <label className="auth-field">
            <span className="auth-label">Sender label</span>
            <input value={recv.from} onChange={(e) => setRecv((r) => ({ ...r, from: e.target.value }))} />
          </label>
          <label className="auth-field">
            <span className="auth-label">Amount (SUI)</span>
            <input type="number" step="0.01" value={recv.amount} onChange={(e) => setRecv((r) => ({ ...r, amount: e.target.value }))} />
          </label>
          <label className="auth-field">
            <span className="auth-label">Note</span>
            <input value={recv.memo} onChange={(e) => setRecv((r) => ({ ...r, memo: e.target.value }))} />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setRecvOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Confirm</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
