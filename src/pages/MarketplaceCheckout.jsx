import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Copy } from 'lucide-react';
import { useDAppKit, useCurrentAccount, useWalletConnection } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useToast } from '../context/ToastContext';
import { availableTonnesForUser } from '../utils/stockMath';
import { getSuiNetwork } from '../config/suiNetwork';
import { MAX_CREDIT_UGX } from '../utils/creditRules';
import { isLikelySuiAddress } from '../utils/suiAddress';
import {
  effectivePricePerKgUgx,
  suggestedUgxForKg,
  suggestedUgxForTonnage,
  availableKgForHarvest,
  tonnesFromKg,
} from '../utils/harvestListing';
import { fetchCheckoutConfig } from '../api/agritrackApi';
import { platformFeeFromTotal } from '../utils/checkoutFee';
import { isFiniteNumberGte, isPositiveFinite, isValidIsoDateString } from '../utils/authValidation';

export default function MarketplaceCheckout() {
  const { t } = useTranslation();
  const { harvestId: harvestIdParam } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    marketplaceHarvests,
    currentUser,
    allUsers,
    recordTraderPurchase,
    recordOnchainDevnetPayment,
    wallet,
    apiEnabled,
    apiStatus,
    sessionResolving,
    refreshFromApi,
    state,
  } = useAgriTrack();

  const sui = useDAppKit();
  const account = useCurrentAccount();
  const walletConn = useWalletConnection();
  const suiNet = getSuiNetwork();

  const id = harvestIdParam ? decodeURIComponent(harvestIdParam) : '';
  const buyHarvest = useMemo(
    () => (id ? marketplaceHarvests.find((x) => x.id === id) : null),
    [id, marketplaceHarvests],
  );

  const [buyForm, setBuyForm] = useState({
    /** Quantity in kg (UI); API still records tonnes). */
    quantityKg: '',
    totalPayment: '',
    settlementMethod: 'sui',
    paymentStatus: 'paid',
    amountPaid: '',
    creditDueDate: '',
    date: new Date().toISOString().slice(0, 10),
    paySuiAmount: '0.01',
    mockSuiAmount: '',
    paymentProvider: 'mtn_momo',
    paymentReference: '',
    /** MTN/Airtel number the buyer pays from — stored on the sale record. */
    payerPhoneMsisdn: '',
  });
  const [payBusy, setPayBusy] = useState(false);
  const [checkoutCfg, setCheckoutCfg] = useState(() => ({
    platformFeeBps: Number(import.meta.env.VITE_PLATFORM_FEE_BPS || 0),
    platformMomoMsisdn: import.meta.env.VITE_PLATFORM_MOMO_MSISDN || null,
    platformAccountName: import.meta.env.VITE_PLATFORM_ACCOUNT_NAME || 'AgriTrack Platform',
  }));

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await fetchCheckoutConfig();
        if (!cancelled && c) {
          setCheckoutCfg({
            platformFeeBps: Number(c.platformFeeBps ?? 0),
            platformMomoMsisdn: c.platformMomoMsisdn || null,
            platformAccountName: c.platformAccountName || 'AgriTrack Platform',
          });
        }
      } catch {
        /* keep Vite fallbacks */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiEnabled]);

  useEffect(() => {
    if (!buyHarvest) return;
    const defT = Math.max(0.01, Number(buyHarvest.tonnage) || 0.01);
    const defKg = defT * 1000;
    const sugg =
      effectivePricePerKgUgx(buyHarvest) > 0
        ? suggestedUgxForKg(buyHarvest, defKg)
        : suggestedUgxForTonnage(buyHarvest, defT) || '';
    setBuyForm({
      quantityKg: String(Number.isInteger(defKg) ? defKg : Number(defKg.toFixed(2))),
      totalPayment: sugg || '',
      settlementMethod: 'sui',
      paymentStatus: 'paid',
      amountPaid: '',
      creditDueDate: '',
      date: new Date().toISOString().slice(0, 10),
      paySuiAmount: '0.01',
      mockSuiAmount: '',
      paymentProvider: 'mtn_momo',
      paymentReference: '',
      payerPhoneMsisdn: currentUser?.profile?.phone?.trim() || '',
    });
  }, [buyHarvest, currentUser?.profile?.phone]);

  const sellerName = useCallback(
    (userId) => {
      const u = allUsers?.find((x) => x.id === userId);
      return u?.profile?.name || 'Farmer';
    },
    [allUsers],
  );

  /** Seller receiving details: from API procurement `sellerPayout`, else profile fallback. */
  const sellerPayoutInfo = useMemo(() => {
    if (!buyHarvest) return null;
    const sp = buyHarvest.sellerPayout;
    const farmer = allUsers?.find((x) => x.id === buyHarvest.userId);
    const moMo =
      (sp?.moMoNumber && String(sp.moMoNumber).trim()) ||
      farmer?.profile?.receiveMoneyPhone?.trim() ||
      farmer?.profile?.phone?.trim() ||
      '';
    const regName =
      (sp?.registeredName && String(sp.registeredName).trim()) ||
      farmer?.profile?.receiveMoneyName?.trim() ||
      '';
    const bank = (sp?.bankDetails || farmer?.profile?.bankDetails || '').trim();
    const displayName =
      (sp?.sellerName && String(sp.sellerName).trim()) || sellerName(buyHarvest.userId);
    return { moMo, regName, bank, displayName };
  }, [buyHarvest, allUsers, sellerName]);

  const copyToClipboard = useCallback(
    async (text) => {
      const s = String(text || '').trim();
      if (!s) return;
      try {
        await navigator.clipboard.writeText(s);
        toast(t('marketplaceCheckoutPage.copied'), 'success');
      } catch {
        toast('Could not copy to clipboard.', 'warn');
      }
    },
    [toast, t],
  );

  const premiumTraderActive = useMemo(() => {
    if (currentUser?.role !== 'trader' || !currentUser?.isPremium) return false;
    const raw = currentUser.premiumUntil;
    if (!raw) return true;
    const t = new Date(raw).getTime();
    return !Number.isNaN(t) && t > Date.now();
  }, [currentUser]);

  useEffect(() => {
    if (!premiumTraderActive && buyForm.settlementMethod === 'credit') {
      setBuyForm((f) => ({
        ...f,
        settlementMethod: 'sui',
        paymentStatus: 'paid',
      }));
    }
  }, [premiumTraderActive, buyForm.settlementMethod]);

  const showPartial =
    buyForm.settlementMethod === 'mobile_money' &&
    (buyForm.paymentStatus === 'partial' || buyForm.paymentStatus === 'credit');

  const runDevnetPayToFarmer = useCallback(
    async (saleId, recipient, suiN) => {
      const mist = BigInt(Math.round(suiN * 1e9));
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
      const r = await recordOnchainDevnetPayment(saleId, {
        digest,
        mist: Number(mist),
        sender: account.address,
        recipient,
      });
      if (!r.ok) throw new Error(r.error || 'Could not confirm payment on server.');
      return digest;
    },
    [sui, account?.address, recordOnchainDevnetPayment],
  );

  const onQuantityKgChange = (e) => {
    const raw = e.target.value;
    setBuyForm((f) => {
      const next = { ...f, quantityKg: raw };
      const kg = Number(raw);
      if (
        buyHarvest &&
        effectivePricePerKgUgx(buyHarvest) > 0 &&
        Number.isFinite(kg) &&
        kg > 0
      ) {
        const auto = suggestedUgxForKg(buyHarvest, kg);
        if (auto) next.totalPayment = auto;
      }
      return next;
    });
  };

  const onBuySubmit = async (e) => {
    e.preventDefault();
    if (!buyHarvest) return;
    const settlementMethod = buyForm.settlementMethod;
    if (!isPositiveFinite(buyForm.quantityKg)) {
      toast('Enter a valid quantity in kilograms.', 'warn');
      return;
    }
    const kg = Number(buyForm.quantityKg);
    const tonnes = tonnesFromKg(kg);
    if (!isFiniteNumberGte(buyForm.totalPayment, 1)) {
      toast('Enter a valid total amount in UGX (at least 1).', 'warn');
      return;
    }
    if (!isValidIsoDateString(buyForm.date)) {
      toast('Choose a valid sale date.', 'warn');
      return;
    }
    if (farmerAvailable != null && tonnes > farmerAvailable + 1e-6) {
      toast(
        `Maximum for this produce is about ${Math.round(farmerAvailable * 1000).toLocaleString()} kg (${farmerAvailable.toFixed(2)} t).`,
        'warn',
      );
      return;
    }

    if (settlementMethod === 'credit') {
      if (!premiumTraderActive) {
        toast('On-credit checkout needs an active Premium Trader upgrade.', 'warn');
        return;
      }
      if (!isValidIsoDateString(buyForm.creditDueDate)) {
        toast('Choose a credit due date.', 'warn');
        return;
      }
    }

    let suiRecipient = '';
    if (settlementMethod === 'sui') {
      if (!walletConn.isConnected || !account?.address) {
        toast(`Connect your wallet (e.g. Slush on ${suiNet}) first.`, 'warn');
        return;
      }
      const farmer = allUsers?.find((u) => u.id === buyHarvest.userId);
      suiRecipient = farmer?.profile?.suiAddress?.trim() || '';
      if (!isLikelySuiAddress(suiRecipient)) {
        toast('Farmer must save a valid Sui address on their profile before on-chain checkout.', 'error');
        return;
      }
      if (!isPositiveFinite(buyForm.paySuiAmount)) {
        toast('Enter a valid SUI amount for the transfer.', 'warn');
        return;
      }
    }

    setPayBusy(true);
    try {
      const r = await recordTraderPurchase({
        harvest: buyHarvest,
        tonnage: String(tonnesFromKg(buyForm.quantityKg)),
        totalPayment: buyForm.totalPayment,
        settlementMethod,
        paymentStatus: buyForm.paymentStatus,
        amountPaid: buyForm.amountPaid,
        creditDueDate: buyForm.creditDueDate,
        date: buyForm.date,
        mockSuiAmount: buyForm.mockSuiAmount,
        paymentProvider:
          settlementMethod === 'mobile_money' ? buyForm.paymentProvider : undefined,
        paymentReference:
          settlementMethod === 'mobile_money' ? buyForm.paymentReference : undefined,
        payerPhoneMsisdn:
          settlementMethod === 'mobile_money' ? buyForm.payerPhoneMsisdn?.trim() : undefined,
      });
      if (!r.ok) {
        toast(r.error || 'Could not complete purchase', 'error');
        return;
      }

      if (settlementMethod === 'sui' && r.sale?.id) {
        const suiN = Number(buyForm.paySuiAmount);
        try {
          const digest = await runDevnetPayToFarmer(r.sale.id, suiRecipient, suiN);
          toast(`Paid on-chain — ${digest.slice(0, 10)}… Sale marked paid.`);
        } catch (err) {
          toast(
            err?.message ||
              'Sale is pending — complete payment from Wallet or retry checkout.',
            'error',
          );
          return;
        }
      } else {
        toast(
          settlementMethod === 'credit'
            ? 'Credit sale recorded — settle later with Sui or mobile money.'
            : settlementMethod === 'mobile_money'
              ? 'Purchase recorded (digital UGX) — keep the receipt reference on file.'
              : 'Purchase recorded — farmer stock and dashboards update.',
        );
      }
      navigate('/purchases');
    } finally {
      setPayBusy(false);
    }
  };

  const buyerLabel = currentUser?.profile?.name?.trim() || '—';

  const farmerAvailable = useMemo(() => {
    if (!buyHarvest?.userId || !buyHarvest.produceName) return null;
    return availableTonnesForUser(
      state.harvests,
      state.sales,
      buyHarvest.userId,
      buyHarvest.produceName,
    );
  }, [buyHarvest, state.harvests, state.sales]);

  const listPriceUgxPerKg = buyHarvest != null ? effectivePricePerKgUgx(buyHarvest) : 0;
  const bookTotalNum = useMemo(() => {
    const n = Number(buyForm.totalPayment);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [buyForm.totalPayment]);
  const feePreview = useMemo(
    () => platformFeeFromTotal(bookTotalNum, checkoutCfg.platformFeeBps),
    [bookTotalNum, checkoutCfg.platformFeeBps],
  );
  const suggestedBookUgx = useMemo(() => {
    if (!buyHarvest || listPriceUgxPerKg <= 0) return null;
    const kg = Number(buyForm.quantityKg);
    if (!Number.isFinite(kg) || kg <= 0) return null;
    const s = suggestedUgxForKg(buyHarvest, kg);
    return s ? Number(s) : null;
  }, [buyHarvest, listPriceUgxPerKg, buyForm.quantityKg]);

  const tonnesPreview = useMemo(() => {
    const t = tonnesFromKg(buyForm.quantityKg);
    return Number.isFinite(t) && t > 0 ? t : 0;
  }, [buyForm.quantityKg]);

  if (currentUser?.role !== 'trader') {
    return <Navigate to="/marketplace" replace />;
  }
  if (!id) {
    return <Navigate to="/marketplace" replace />;
  }

  if (apiEnabled && !buyHarvest && (sessionResolving || apiStatus.loading)) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-8 text-center text-slate-600">
        <p className="text-sm font-medium">Loading this listing…</p>
        <p className="text-xs text-slate-500">If this takes a while, check your network connection.</p>
      </div>
    );
  }

  if (apiEnabled && !buyHarvest && apiStatus.error) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-slate-800">
        <p className="text-sm">{apiStatus.error}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            onClick={() => {
              void refreshFromApi();
            }}
          >
            Retry
          </button>
          <Link to="/marketplace" className="font-semibold text-emerald-800 hover:underline">
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (!buyHarvest) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-slate-600">This listing was not found or is no longer available.</p>
        <Link to="/marketplace" className="font-semibold text-emerald-700 hover:underline">
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-6 sm:pb-8">
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Link
          to="/marketplace"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to marketplace
        </Link>
        <Link
          to={`/marketplace/listing/${encodeURIComponent(buyHarvest.id)}`}
          className="text-sm font-semibold text-emerald-700 hover:underline sm:text-right"
        >
          View listing details
        </Link>
      </div>

      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Checkout</p>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-slate-900 sm:text-2xl">
          Buy {buyHarvest.produceName}
        </h1>
      </div>

      <form
        onSubmit={onBuySubmit}
        noValidate
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-3"
      >
        <div className="space-y-3 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-700">
            <p>
              <strong>Seller:</strong> {sellerName(buyHarvest.userId)} · <strong>Listed:</strong>{' '}
              {Number(buyHarvest.tonnage).toFixed(2)} t
            </p>
            <p className="mt-1">
              <strong>Buyer:</strong> {buyerLabel}
              {listPriceUgxPerKg > 0 ? (
                <>
                  {' '}· <strong>Asking:</strong> UGX {listPriceUgxPerKg.toLocaleString()}/kg
                </>
              ) : null}
              {farmerAvailable != null ? (
                <>
                  {' '}· <strong>Available:</strong> {farmerAvailable.toFixed(2)} t
                </>
              ) : null}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="auth-field block">
              <span className="auth-label">Quantity (kg)</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                type="number"
                step="0.01"
                value={buyForm.quantityKg}
                onChange={onQuantityKgChange}
              />
              <span className="text-xs text-slate-500">
                {tonnesPreview > 0 ? `≈ ${tonnesPreview.toFixed(4)} t in ledger` : 'Enter quantity'}
              </span>
            </label>
            <label className="auth-field block">
              <span className="auth-label">Total amount (UGX)</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                type="number"
                value={buyForm.totalPayment}
                onChange={(e) => setBuyForm((f) => ({ ...f, totalPayment: e.target.value }))}
              />
              {suggestedBookUgx != null && listPriceUgxPerKg > 0 ? (
                <span className="text-xs text-slate-500">
                  Auto value at listed price: UGX {suggestedBookUgx.toLocaleString()}
                </span>
              ) : null}
            </label>
          </div>

          <label className="auth-field block">
          <span className="auth-label">Payment method</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={buyForm.settlementMethod}
            onChange={(e) => {
              const v = e.target.value;
              setBuyForm((f) => ({
                ...f,
                settlementMethod: v,
                paymentStatus:
                  v === 'credit' ? 'credit' : v === 'mobile_money' ? 'paid' : v === 'sui' ? 'paid' : f.paymentStatus,
              }));
            }}
          >
            <option value="sui">Pay now (Sui · {suiNet})</option>
            {premiumTraderActive ? (
              <option value="credit">
                On credit (UGX — max {MAX_CREDIT_UGX.toLocaleString()} · Premium Trader)
              </option>
            ) : null}
            <option value="mobile_money">Mobile money (MTN / Airtel — digital UGX)</option>
          </select>
          </label>
          {currentUser?.role === 'trader' && !premiumTraderActive ? (
            <p className="text-sm text-slate-600">
              Credit requires Premium Trader upgrade (cap UGX {MAX_CREDIT_UGX.toLocaleString()}).
            </p>
          ) : null}
          {buyForm.settlementMethod === 'sui' ? (
            <label className="auth-field block">
              <span className="auth-label">SUI to send ({suiNet})</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                type="number"
                step="0.001"
                value={buyForm.paySuiAmount}
                onChange={(e) => setBuyForm((f) => ({ ...f, paySuiAmount: e.target.value }))}
              />
            </label>
          ) : null}
          {buyForm.settlementMethod === 'credit' ? (
            <label className="auth-field block">
              <span className="auth-label">Credit due date</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                type="date"
                value={buyForm.creditDueDate}
                onChange={(e) => setBuyForm((f) => ({ ...f, creditDueDate: e.target.value }))}
              />
            </label>
          ) : null}
          {buyForm.settlementMethod === 'mobile_money' ? (
            <>
              <div
                className="space-y-3 rounded-xl border-2 border-emerald-200/90 bg-emerald-50/50 px-3 py-3 text-sm shadow-sm dark:border-emerald-800/50 dark:bg-emerald-950/25"
                role="region"
                aria-label={t('marketplaceCheckoutPage.paySellerTitle')}
              >
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
                {t('marketplaceCheckoutPage.paySellerTitle')}
              </p>
              <p className="text-slate-700 dark:text-slate-300">{t('marketplaceCheckoutPage.paySellerLead')}</p>
              <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2 dark:border-emerald-900/60 dark:bg-zinc-950/40">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  {t('marketplaceCheckoutPage.sellerReceives')}
                  {sellerPayoutInfo?.displayName ? (
                    <span className="ml-1 font-semibold normal-case text-slate-900 dark:text-slate-100">
                      ({sellerPayoutInfo.displayName})
                    </span>
                  ) : null}
                </p>
                {sellerPayoutInfo?.moMo ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {sellerPayoutInfo.moMo}
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200"
                      onClick={() => copyToClipboard(sellerPayoutInfo.moMo)}
                    >
                      <Copy className="size-3.5" aria-hidden />
                      {t('marketplaceCheckoutPage.copyNumber')}
                    </button>
                  </div>
                ) : (
                  <p className="text-amber-800 dark:text-amber-200">{t('marketplaceCheckoutPage.sellerMissingPayout')}</p>
                )}
                {sellerPayoutInfo?.regName ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">{t('marketplaceCheckoutPage.registeredAs')}:</span>{' '}
                    {sellerPayoutInfo.regName}
                  </p>
                ) : null}
                {sellerPayoutInfo?.bank ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">{t('marketplaceCheckoutPage.bankOption')}:</span> {sellerPayoutInfo.bank}
                  </p>
                ) : null}
                <p className="mt-2 border-t border-emerald-100 pt-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">{t('marketplaceCheckoutPage.amountUgxLabel')}:</span>{' '}
                  <span className="tabular-nums">{bookTotalNum > 0 ? bookTotalNum.toLocaleString() : '—'}</span>
                </p>
              </div>
              {checkoutCfg.platformMomoMsisdn?.trim() ? (
                <p className="mb-0 text-xs text-slate-500 dark:text-slate-500">
                  {t('marketplaceCheckoutPage.platformEscrowNote')}{' '}
                  <span className="font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                    {checkoutCfg.platformMomoMsisdn.trim()}
                  </span>
                </p>
              ) : null}
              </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="auth-field block">
                <span className="auth-label">{t('marketplaceCheckoutPage.yourWalletTitle')}</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                  inputMode="tel"
                  autoComplete="tel"
                  value={buyForm.payerPhoneMsisdn}
                  onChange={(e) => setBuyForm((f) => ({ ...f, payerPhoneMsisdn: e.target.value }))}
                  placeholder="+256…"
                />
              </label>
              <label className="auth-field block">
                <span className="auth-label">Provider</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                  value={buyForm.paymentProvider}
                  onChange={(e) => setBuyForm((f) => ({ ...f, paymentProvider: e.target.value }))}
                >
                  <option value="mtn_momo">MTN MoMo</option>
                  <option value="airtel_money">Airtel Money</option>
                  <option value="other">Other / bank-to-wallet</option>
                </select>
              </label>
              <label className="auth-field block sm:col-span-2">
                <span className="auth-label">Transaction reference</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                  value={buyForm.paymentReference}
                  onChange={(e) => setBuyForm((f) => ({ ...f, paymentReference: e.target.value }))}
                  placeholder="ID from SMS/app"
                />
              </label>
            </div>
            </>
          ) : null}

          {showPartial ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="auth-field block">
                <span className="auth-label">Paid so far (UGX)</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  type="number"
                  value={buyForm.amountPaid}
                  onChange={(e) => setBuyForm((f) => ({ ...f, amountPaid: e.target.value }))}
                />
              </label>
              <label className="auth-field block">
                <span className="auth-label">Balance due by</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  type="date"
                  value={buyForm.creditDueDate}
                  onChange={(e) => setBuyForm((f) => ({ ...f, creditDueDate: e.target.value }))}
                />
              </label>
            </div>
          ) : null}

          <label className="auth-field block">
            <span className="auth-label">Sale date</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              type="date"
              value={buyForm.date}
              onChange={(e) => setBuyForm((f) => ({ ...f, date: e.target.value }))}
            />
          </label>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          {bookTotalNum > 0 ? (
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-3 text-sm text-slate-800">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Payment summary
              </p>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between gap-2">
                  <span>Total</span>
                  <span className="font-semibold tabular-nums">UGX {bookTotalNum.toLocaleString()}</span>
                </li>
                {feePreview.platformFeeUgx > 0 ? (
                  <li className="flex justify-between gap-2 text-slate-700">
                    <span>Platform fee ({(checkoutCfg.platformFeeBps / 100).toFixed(1)}%)</span>
                    <span className="tabular-nums">UGX {feePreview.platformFeeUgx.toLocaleString()}</span>
                  </li>
                ) : null}
                <li className="flex justify-between gap-2 border-t border-emerald-200/80 pt-2 font-medium text-emerald-900">
                  <span>Farmer share</span>
                  <span className="tabular-nums">UGX {feePreview.farmerPayoutUgx.toLocaleString()}</span>
                </li>
              </ul>
            </div>
          ) : null}

          {!apiEnabled ? (
            <label className="auth-field block rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <span className="auth-label">Mock SUI (offline)</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                type="number"
                step="0.01"
                value={buyForm.mockSuiAmount}
                onChange={(e) => setBuyForm((f) => ({ ...f, mockSuiAmount: e.target.value }))}
                placeholder={wallet.connected ? 'Link mock ledger' : 'Connect mock wallet'}
                disabled={!wallet.connected}
              />
            </label>
          ) : null}

          <div className="space-y-2">
            {apiEnabled ? (
              <p className="text-xs text-slate-500">
                If API checkout fails with 403, seller can record this sale using buyer name <strong>{buyerLabel}</strong>.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Link
                to="/marketplace"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </Link>
              <button type="submit" className="btn-primary min-h-11 flex-1 rounded-xl px-4 py-2.5 text-sm font-bold" disabled={payBusy}>
                {payBusy ? 'Working…' : 'Complete purchase'}
              </button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
