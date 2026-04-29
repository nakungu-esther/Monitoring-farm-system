import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react';
import { API_ENABLED } from '../config';
import {
  fetchProcurements,
  fetchSales,
  fetchFarms,
  fetchExpenses,
  fetchSeasonalPlans,
  fetchSupplyChainEvents,
  fetchNotificationReadKeys,
  fetchSmsLogs,
  createProcurement,
  createSale,
  createFarm,
  createExpense,
  createSeasonalPlan,
  patchSeasonalPlan,
  deleteSeasonalPlanById,
  seasonalPlanRestId,
  createSupplyChainEvent,
  createSmsLog,
  fetchFarmDailyLogs,
  createFarmDailyLog,
  mapFarmDailyLogFromApi,
  updateProcurement,
  deleteProcurement,
  patchSale,
  confirmSaleSuiPayment,
  mapProcurementToHarvest,
  mapSaleFromApi,
  mapFarmFromApi,
  mapExpenseFromApi,
  mapSeasonalPlanFromApi,
  mapSupplyEventFromApi,
  mapSmsLogFromApi,
  procurementFarmRestId,
  markNotificationReadKey,
} from '../api/agritrackApi';
import {
  setStoredToken,
  getStoredToken,
  apiLogin,
  apiRegister,
  fetchMe,
  apiUpdateProfile,
  apiErrorMessage,
  apiForgotPassword,
  apiResetPassword,
} from '../api/auth';
import {
  issuePasswordResetToken,
  consumePasswordResetToken,
} from '../utils/passwordResetStorage';
import { isLikelyNetworkError } from '../utils/networkErrors';
import { availableTonnesForUser } from '../utils/stockMath';
import { validateUgCreditLimits } from '../utils/creditRules';
import { normalizeAppRole } from '../utils/roles';
import { platformFeeFromTotal } from '../utils/checkoutFee';
import { profileNameWithoutDemoPrefix } from '../utils/profileDisplayName';

const STORAGE_KEY = 'agritrack-v1';

function mapApiUserToState(u) {
  const rawName =
    typeof u?.name === 'string' ? u.name.trim() : '';
  const name =
    rawName !== '' ? profileNameWithoutDemoPrefix(rawName) || rawName : '';

  return {
    id: u.id,
    email: u.email,
    password: '',
    role: normalizeAppRole(u.role),
    isPremium: Boolean(u.isPremium),
    subscriptionType: u.subscriptionType || 'free',
    premiumUntil: u.premiumUntil || null,
    profile: {
      name,
      phone: u.phone || '',
      location: u.location || '',
      suiAddress: u.suiAddress || u.sui_address || '',
      receiveMoneyPhone:
        u.receiveMoneyPhone ?? u.receive_money_phone ?? '',
      receiveMoneyName: u.receiveMoneyName ?? u.receive_money_name ?? '',
      bankDetails: u.bankDetails ?? u.bank_details ?? '',
    },
  };
}

function mergeUsers(users, incoming) {
  const rest = users.filter((x) => x.id !== incoming.id);
  return [...rest, incoming];
}

function applyMockSuiToSale(prevState, sale, row) {
  let next = { ...prevState, sales: [...prevState.sales, sale] };
  const sui = Number(row.mockSuiAmount || 0);
  if (prevState.wallet.connected && sui > 0) {
    const txId = `wtx-${Date.now()}`;
    const tx = {
      id: txId,
      type: 'sale_link',
      amountSUI: sui,
      from: 'buyer',
      to: sale.userId,
      saleId: sale.id,
      status: 'confirmed',
      timestamp: new Date().toISOString(),
      memo: `Mock SUI for sale to ${sale.buyerName}`,
    };
    next = {
      ...next,
      walletTransactions: [...next.walletTransactions, tx],
      wallet: {
        ...next.wallet,
        balanceSUI: Number((next.wallet.balanceSUI + sui * 0.99).toFixed(4)),
      },
      sales: next.sales.map((x) =>
        x.id === sale.id ? { ...x, walletTxIds: [...x.walletTxIds, txId] } : x,
      ),
    };
  }
  return next;
}

function appendSmsLog(state, to, body, kind, smsSyncUserId) {
  if (!to) return state;
  const entry = {
    id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    to: String(to),
    body,
    kind,
    at: new Date().toISOString(),
  };
  const prev = Array.isArray(state.mockSmsLog) ? state.mockSmsLog : [];
  const nextState = { ...state, mockSmsLog: [...prev.slice(-199), entry] };
  if (
    API_ENABLED &&
    smsSyncUserId &&
    state.currentUserId === smsSyncUserId
  ) {
    void createSmsLog({ to: String(to), body, kind }).catch(() => {});
  }
  return nextState;
}

function appendSupplyStep(state, saleId, stage, note, userId) {
  const entry = {
    id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    saleId,
    stage,
    note,
    userId: userId || null,
    at: new Date().toISOString(),
  };
  const prev = Array.isArray(state.supplyChainEvents) ? state.supplyChainEvents : [];
  return { ...state, supplyChainEvents: [...prev, entry] };
}

const seedState = () => ({
  users: [
    {
      id: 'u-farmer',
      email: 'farmer@agritrack.demo',
      password: 'farmer123',
      role: 'farmer',
      isPremium: false,
      subscriptionType: 'free',
      premiumUntil: null,
      profile: {
        name: 'Farmer',
        phone: '+256700000002',
        location: 'Jinja',
        suiAddress: '',
        receiveMoneyPhone: '',
        receiveMoneyName: '',
        bankDetails: '',
      },
    },
    {
      id: 'u-trader',
      email: 'trader@agritrack.demo',
      password: 'trader123',
      role: 'trader',
      isPremium: false,
      subscriptionType: 'free',
      premiumUntil: null,
      profile: {
        name: 'Trader',
        phone: '+256700000003',
        location: 'Mbale',
        suiAddress: '',
        receiveMoneyPhone: '',
        receiveMoneyName: '',
        bankDetails: '',
      },
    },
  ],
  currentUserId: null,
  /** No baked-in harvest/sale/farm rows: demo login users only; add produce after sign-in or via API sync. */
  harvests: [],
  sales: [],
  wallet: {
    connected: false,
    address: '',
    balanceSUI: 0,
  },
  walletTransactions: [],
  escrows: [],
  expenses: [],
  readNotifications: [],
  farms: [],
  seasonalPlans: [],
  supplyChainEvents: [],
  mockSmsLog: [],
  /** Farmer daily logs (from API or local only; no baked-in seed entries). */
  farmDailyLogs: [],
});

/** If API sync cleared passwords on seed rows, restore from seed by id. */
function restoreSeedPasswords(users, seedUsers) {
  const seedById = new Map(seedUsers.map((u) => [u.id, u]));
  return users.map((u) => {
    const s = seedById.get(u.id);
    if (s?.password && (u.password == null || u.password === '')) {
      return { ...u, password: s.password };
    }
    return u;
  });
}

function ensureSeedUsersPresent(users, seedUsers) {
  const ids = new Set(users.map((u) => u.id));
  const missing = seedUsers.filter((s) => !ids.has(s.id));
  return missing.length ? [...users, ...missing] : users;
}

/** Rename legacy seed profile labels (“Demo Farmer” / any “Demo …”) → Farmer / Trader / Admin. */
function migrateSeedDisplayNames(users) {
  const toName = { 'u-farmer': 'Farmer', 'u-trader': 'Trader', 'u-admin': 'Admin' };
  return users.map((u) => {
    const want = toName[u.id];
    const n = u.profile?.name;
    if (want && typeof n === 'string') {
      const t = n.trim();
      if (
        t === 'Demo Farmer' ||
        t === 'Demo Trader' ||
        t === 'Demo Admin' ||
        /^\s*demo\b/i.test(t)
      ) {
        return { ...u, profile: { ...u.profile, name: want } };
      }
    }
    return u;
  });
}

function migrateSalesBuyerNames(sales) {
  if (!Array.isArray(sales)) return sales;
  return sales.map((s) => {
    if (!s?.buyerName) return s;
    const b = String(s.buyerName).trim();
    if (b === 'Demo Trader' || /^demo\s+trader$/i.test(b)) return { ...s, buyerName: 'Trader' };
    if (/^\s*demo\s+/i.test(b)) return { ...s, buyerName: b.replace(/^\s*demo\s+/i, '').trim() };
    return s;
  });
}

/** Old seed daily reports (fdl-seed-*) are removed from local storage. */
function withoutSeedFarmDailyLogs(logs) {
  if (!Array.isArray(logs)) return [];
  return logs.filter((l) => !String(l?.id).startsWith('fdl-seed-'));
}

/** Deployed app + API: only Postgres-backed rows use id prefix `api-`. Drop seed/offline rows so Vercel never shows demo Maize/Beans as if it were your DB. */
function keepApiSyncedOnly(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => row && String(row.id).startsWith('api-'));
}

function applyProdApiSourceOfTruth(state) {
  return {
    ...state,
    harvests: keepApiSyncedOnly(state.harvests),
    sales: keepApiSyncedOnly(state.sales),
    farms: keepApiSyncedOnly(state.farms),
    expenses: keepApiSyncedOnly(state.expenses),
    seasonalPlans: keepApiSyncedOnly(state.seasonalPlans),
    supplyChainEvents: keepApiSyncedOnly(state.supplyChainEvents),
    farmDailyLogs: keepApiSyncedOnly(state.farmDailyLogs),
    mockSmsLog: keepApiSyncedOnly(state.mockSmsLog),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (import.meta.env.PROD && API_ENABLED) {
        return applyProdApiSourceOfTruth(seedState());
      }
      return seedState();
    }
    const parsed = JSON.parse(raw);
    const base = seedState();
    let users = parsed.users?.length ? parsed.users : base.users;
    users = restoreSeedPasswords(users, base.users);
    users = ensureSeedUsersPresent(users, base.users);
    users = users.map((u) => ({
      ...u,
      role: normalizeAppRole(u.role),
      isPremium: u.isPremium ?? false,
      subscriptionType: u.subscriptionType || 'free',
      premiumUntil: u.premiumUntil ?? null,
      profile: {
        name: u.profile?.name ?? '',
        phone: u.profile?.phone ?? '',
        location: u.profile?.location ?? '',
        suiAddress: u.profile?.suiAddress ?? '',
        receiveMoneyPhone: u.profile?.receiveMoneyPhone ?? '',
        receiveMoneyName: u.profile?.receiveMoneyName ?? '',
        bankDetails: u.profile?.bankDetails ?? '',
      },
    }));
    users = migrateSeedDisplayNames(users);
    // Deployed presentation: hide Admin entirely (no admin demo accounts in UI/UX).
    if (import.meta.env.PROD) {
      users = users.filter((u) => u.role !== 'admin');
    }
    const salesFromStore = Array.isArray(parsed.sales) ? parsed.sales : base.sales;
    const out = {
      ...base,
      ...parsed,
      users,
      sales: migrateSalesBuyerNames(salesFromStore),
      farms: Array.isArray(parsed.farms) ? parsed.farms : base.farms,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : base.expenses,
      seasonalPlans: Array.isArray(parsed.seasonalPlans) ? parsed.seasonalPlans : base.seasonalPlans,
      supplyChainEvents: Array.isArray(parsed.supplyChainEvents) ? parsed.supplyChainEvents : base.supplyChainEvents,
      mockSmsLog: Array.isArray(parsed.mockSmsLog) ? parsed.mockSmsLog : base.mockSmsLog,
      farmDailyLogs: withoutSeedFarmDailyLogs(
        Array.isArray(parsed.farmDailyLogs) && parsed.farmDailyLogs.length > 0
          ? parsed.farmDailyLogs
          : base.farmDailyLogs,
      ),
    };
    if (import.meta.env.PROD && API_ENABLED) {
      return applyProdApiSourceOfTruth(out);
    }
    return out;
  } catch {
    if (import.meta.env.PROD && API_ENABLED) {
      return applyProdApiSourceOfTruth(seedState());
    }
    return seedState();
  }
}

function saveState(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** Replace API-backed farms and keep unsynced local rows (`farm-*` ids only). */
function mergeFarmsFromApi(previousFarms, apiRows) {
  const fromApi = (apiRows || []).map(mapFarmFromApi);
  const localOnly = (previousFarms || []).filter((f) => String(f.id).startsWith('farm-'));
  return [...fromApi, ...localOnly];
}

function mergeExpensesFromApi(previous, apiRows) {
  const fromApi = (apiRows || []).map(mapExpenseFromApi);
  const localOnly = (previous || []).filter((e) => !String(e.id).startsWith('api-'));
  return [...fromApi, ...localOnly];
}

function mergeSeasonalFromApi(previous, apiRows) {
  const fromApi = (apiRows || []).map(mapSeasonalPlanFromApi);
  const localOnly = (previous || []).filter((p) => !String(p.id).startsWith('api-'));
  return [...fromApi, ...localOnly];
}

function mergeSupplyFromApi(previous, apiRows) {
  const fromApi = (apiRows || []).map(mapSupplyEventFromApi);
  const localOnly = (previous || []).filter((e) => !String(e.id).startsWith('api-'));
  return [...fromApi, ...localOnly];
}

function mergeSmsFromApi(previous, apiRows) {
  const fromApi = (apiRows || []).map(mapSmsLogFromApi);
  const localOnly = (previous || []).filter((e) => !String(e.id).startsWith('api-'));
  return [...fromApi, ...localOnly].slice(-300);
}

function mergeFarmDailyLogsFromApi(previous, apiRows) {
  const fromApi = (apiRows || []).map(mapFarmDailyLogFromApi);
  const localOnly = (previous || []).filter((e) => !String(e.id).startsWith('api-'));
  return [...fromApi, ...localOnly];
}

/** Routes that are not required for harvest/sale sync: failures must not block dashboard (log in dev). */
async function optionalSidecarApi(fn, label) {
  try {
    return await fn();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[AgriTrack] optional sync skipped (${label}):`, apiErrorMessage(e));
    return null;
  }
}

function findLocalLoginUser(users, identifier, password) {
  const raw = identifier.trim();
  const emailMatch = raw.toLowerCase();
  const digits = raw.replace(/\D/g, '');
  return (
    users.find((u) => {
      if (u.password == null || u.password === '') return false;
      if (u.password !== password) return false;
      if (u.email.toLowerCase() === emailMatch) return true;
      const p = u.profile?.phone?.replace(/\D/g, '') || '';
      return digits.length >= 7 && p === digits;
    }) || null
  );
}

const AgriTrackContext = createContext(null);

function buildLedger(visibleHarvests, visibleSales) {
  const entries = [];
  visibleHarvests.forEach((h) => {
    entries.push({
      id: `in-${h.id}`,
      kind: 'in',
      produceName: h.produceName,
      tonnage: Number(h.tonnage),
      date: h.date,
      ref: `Harvest`,
      farmLocation: h.farmLocation,
    });
  });
  visibleSales.forEach((s) => {
    entries.push({
      id: `out-${s.id}`,
      kind: 'out',
      produceName: s.produceName,
      tonnage: Number(s.tonnage),
      date: s.date,
      ref: s.buyerName,
    });
  });
  entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return entries;
}

export function AgriTrackProvider({ children }) {
  const [state, setState] = useState(loadState);
  const [apiStatus, setApiStatus] = useState({ loading: false, error: null });
  /** When API mode + JWT: true until /auth/me and first refresh finish (or fail). Avoids spurious /auth redirect. */
  const [sessionResolving, setSessionResolving] = useState(
    () => API_ENABLED && !!getStoredToken(),
  );

  const refreshFromApi = useCallback(async () => {
    if (!API_ENABLED) return;
    setApiStatus({ loading: true, error: null });
    try {
      const [proc, sal, farmRows, expRows, seasonalRows, supplyRows, notifRead, smsRows, logRows] =
        await Promise.all([
          fetchProcurements(),
          fetchSales(),
          optionalSidecarApi(() => fetchFarms(), 'farms'),
          optionalSidecarApi(() => fetchExpenses(), 'expenses'),
          optionalSidecarApi(() => fetchSeasonalPlans(), 'seasonalPlans'),
          optionalSidecarApi(() => fetchSupplyChainEvents(), 'supplyChain'),
          optionalSidecarApi(() => fetchNotificationReadKeys(), 'notifications'),
          optionalSidecarApi(() => fetchSmsLogs(), 'sms'),
          optionalSidecarApi(() => fetchFarmDailyLogs(), 'farmDailyLogs'),
        ]);
      setState((s) => ({
        ...s,
        harvests: proc.map(mapProcurementToHarvest),
        sales: sal.map(mapSaleFromApi),
        ...(farmRows !== null ? { farms: mergeFarmsFromApi(s.farms, farmRows) } : {}),
        ...(expRows !== null ? { expenses: mergeExpensesFromApi(s.expenses, expRows) } : {}),
        ...(seasonalRows !== null
          ? { seasonalPlans: mergeSeasonalFromApi(s.seasonalPlans, seasonalRows) }
          : {}),
        ...(supplyRows !== null
          ? { supplyChainEvents: mergeSupplyFromApi(s.supplyChainEvents, supplyRows) }
          : {}),
        ...(notifRead?.keys
          ? { readNotifications: notifRead.keys }
          : {}),
        ...(smsRows !== null
          ? { mockSmsLog: mergeSmsFromApi(s.mockSmsLog, smsRows) }
          : {}),
        ...(logRows !== null
          ? { farmDailyLogs: mergeFarmDailyLogsFromApi(s.farmDailyLogs, logRows) }
          : {}),
      }));
      setApiStatus({ loading: false, error: null });
    } catch (e) {
      if (e.response?.status === 401) {
        setStoredToken(null);
        setState((s) => ({ ...s, currentUserId: null }));
      }
      setApiStatus({ loading: false, error: apiErrorMessage(e) });
    }
  }, []);

  useEffect(() => {
    if (!API_ENABLED) {
      setSessionResolving(false);
      return;
    }
    const token = getStoredToken();
    if (!token) {
      setSessionResolving(false);
      return;
    }
    setStoredToken(token);
    setSessionResolving(true);
    setApiStatus({ loading: true, error: null });
    let cancelled = false;
    (async () => {
      try {
        const u = await fetchMe();
        if (cancelled) return;
        const user = mapApiUserToState(u);
        setState((s) => ({
          ...s,
          users: mergeUsers(s.users, user),
          currentUserId: user.id,
        }));
        await refreshFromApi();
      } catch (e) {
        if (cancelled) return;
        if (e.response?.status === 401) {
          setStoredToken(null);
          setState((s) => ({ ...s, currentUserId: null }));
          setApiStatus({ loading: false, error: null });
          return;
        }
        if (isLikelyNetworkError(e)) {
          setApiStatus({
            loading: false,
            error: 'Offline or unreachable API. Working from data saved on this device.',
          });
          return;
        }
        setStoredToken(null);
        setApiStatus({ loading: false, error: null });
      } finally {
        if (!cancelled) {
          setSessionResolving(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshFromApi]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.currentUserId) ?? null,
    [state.users, state.currentUserId],
  );

  const isAdmin = currentUser?.role === 'admin';

  const visibleHarvests = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'trader') return [];
    if (isAdmin) return state.harvests;
    return state.harvests.filter(
      (h) => !h.userId || h.userId === currentUser.id,
    );
  }, [state.harvests, currentUser, isAdmin]);

  /** Full catalog for trader marketplace & admin (featured first; premium traders: newest next). */
  const marketplaceHarvests = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'trader' || currentUser.role === 'admin') {
      const now = Date.now();
      const featuredActive = (h) => {
        if (!h.isFeatured) return false;
        if (!h.featuredUntil) return true;
        const t = new Date(h.featuredUntil).getTime();
        return !Number.isNaN(t) && t > now;
      };
      const isPremiumTrader = currentUser.role === 'trader' && Boolean(currentUser.isPremium);
      return [...state.harvests].sort((a, b) => {
        const af = featuredActive(a) ? 1 : 0;
        const bf = featuredActive(b) ? 1 : 0;
        if (bf !== af) return bf - af;
        const ad = new Date(a.date).getTime();
        const bd = new Date(b.date).getTime();
        if (currentUser.role === 'admin' || isPremiumTrader) {
          return bd - ad;
        }
        if (currentUser.role === 'trader') {
          return ad - bd;
        }
        return bd - ad;
      });
    }
    return [];
  }, [state.harvests, currentUser]);

  const visibleSales = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return state.sales;
    if (currentUser.role === 'trader') {
      const name = currentUser.profile?.name?.trim().toLowerCase();
      if (!name) return [];
      return state.sales.filter(
        (s) => (s.buyerName || '').trim().toLowerCase() === name,
      );
    }
    return state.sales.filter(
      (s) => !s.userId || s.userId === currentUser.id,
    );
  }, [state.sales, currentUser, isAdmin]);

  const visibleExpenses = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return state.expenses;
    return state.expenses.filter((e) => e.userId === currentUser.id);
  }, [state.expenses, currentUser, isAdmin]);

  const visibleFarmDailyLogs = useMemo(() => {
    if (!currentUser) return [];
    const logs = state.farmDailyLogs || [];
    if (isAdmin || currentUser.role === 'trader') return logs;
    return logs.filter((l) => l.userId === currentUser.id);
  }, [state.farmDailyLogs, currentUser, isAdmin]);

  const stockByProduce = useMemo(() => {
    const m = {};
    visibleHarvests.forEach((h) => {
      const k = h.produceName.trim();
      if (!k) return;
      m[k] = (m[k] || 0) + Number(h.tonnage);
    });
    visibleSales.forEach((s) => {
      const k = s.produceName.trim();
      if (!k) return;
      m[k] = (m[k] || 0) - Number(s.tonnage);
    });
    return m;
  }, [visibleHarvests, visibleSales]);

  const stockLedger = useMemo(
    () => buildLedger(visibleHarvests, visibleSales),
    [visibleHarvests, visibleSales],
  );

  const visibleFarms = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'trader') return [];
    if (isAdmin) return state.farms || [];
    return (state.farms || []).filter((f) => !f.userId || f.userId === currentUser.id);
  }, [state.farms, currentUser, isAdmin]);

  const visibleSeasonalPlans = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'trader') return [];
    if (isAdmin) return state.seasonalPlans || [];
    return (state.seasonalPlans || []).filter((p) => !p.userId || p.userId === currentUser.id);
  }, [state.seasonalPlans, currentUser, isAdmin]);

  const visibleSupplyEvents = useMemo(() => {
    const saleIds = new Set(visibleSales.map((s) => s.id));
    return (state.supplyChainEvents || []).filter((e) => saleIds.has(e.saleId));
  }, [state.supplyChainEvents, visibleSales]);

  const outstandingDebts = useMemo(
    () => visibleSales.filter((s) => {
      const out = s.totalPayment - (s.amountPaid || 0);
      return out > 0 && (s.paymentStatus === 'credit' || s.paymentStatus === 'partial');
    }),
    [visibleSales],
  );

  const creditOwedAsBuyer = useMemo(() => {
    if (!currentUser) return [];
    const uid = currentUser.id;
    const name = currentUser.profile?.name?.trim().toLowerCase() || '';
    return state.sales.filter((s) => {
      const nameMatch = name && (s.buyerName || '').trim().toLowerCase() === name;
      const idMatch = s.buyerUserId === uid;
      if (!nameMatch && !idMatch) return false;
      const out = s.totalPayment - (s.amountPaid || 0);
      return out > 0 && (s.paymentStatus === 'credit' || s.paymentStatus === 'partial');
    });
  }, [currentUser, state.sales]);

  const purchasesAsBuyer = useMemo(() => {
    if (!currentUser) return [];
    const uid = currentUser.id;
    const name = currentUser.profile?.name?.trim().toLowerCase() || '';
    return state.sales
      .filter((s) => {
        const nameMatch = name && (s.buyerName || '').trim().toLowerCase() === name;
        const idMatch = s.buyerUserId === uid;
        return nameMatch || idMatch;
      })
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [currentUser, state.sales]);

  const seasonalReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list = [];
    visibleSeasonalPlans.forEach((p) => {
      const plant = new Date(p.plantDate);
      plant.setHours(0, 0, 0, 0);
      const harvest = new Date(p.expectedHarvestDate);
      harvest.setHours(0, 0, 0, 0);
      const daysToPlant = Math.ceil((plant - today) / 86400000);
      const daysToHarvest = Math.ceil((harvest - today) / 86400000);
      if (daysToPlant >= 0 && daysToPlant <= 30) {
        list.push({
          id: `sr-plant-${p.id}`,
          type: 'plant',
          plan: p,
          days: daysToPlant,
          message: daysToPlant <= 0
            ? `Time to plant ${p.crop}`
            : `Plant ${p.crop} in ${daysToPlant} day(s)`,
        });
      }
      if (daysToHarvest >= 0 && daysToHarvest <= 60) {
        list.push({
          id: `sr-harv-${p.id}`,
          type: 'harvest',
          plan: p,
          days: daysToHarvest,
          message: daysToHarvest <= 0
            ? `Expected harvest window: ${p.crop}. Prepare now`
            : `Expected harvest: ${p.crop} in ~${Math.ceil(daysToHarvest / 7)} week(s)`,
        });
      }
    });
    return list;
  }, [visibleSeasonalPlans]);

  const strategicAnalytics = useMemo(() => {
    const byCrop = {};
    visibleSales.forEach((s) => {
      const k = s.produceName?.trim() || 'Other';
      byCrop[k] = (byCrop[k] || 0) + Math.min(s.amountPaid ?? 0, s.totalPayment);
    });
    const cropEntries = Object.entries(byCrop).sort((a, b) => b[1] - a[1]);

    const byBuyer = {};
    visibleSales.forEach((s) => {
      const k = s.buyerName?.trim() || 'Unknown';
      byBuyer[k] = (byBuyer[k] || 0) + Math.min(s.amountPaid ?? 0, s.totalPayment);
    });
    const buyerEntries = Object.entries(byBuyer).sort((a, b) => b[1] - a[1]);

    return {
      mostProfitableCrop: cropEntries[0] || null,
      topBuyer: buyerEntries[0] || null,
      revenueByCrop: cropEntries,
      revenueByBuyer: buyerEntries,
    };
  }, [visibleSales]);

  const login = useCallback(
    async (identifier, password) => {
      if (API_ENABLED) {
        const raw = identifier.trim();
        const email = raw.includes('@') ? raw.toLowerCase() : null;
        if (!email) {
          return {
            ok: false,
            error: 'When using the API, sign in with your email address.',
          };
        }
        try {
          const data = await apiLogin(email, password);
          setStoredToken(data.accessToken);
          const user = mapApiUserToState(data.user);
          setState((s) => ({
            ...s,
            users: mergeUsers(s.users, user),
            currentUserId: user.id,
          }));
          await refreshFromApi();
          return { ok: true };
        } catch (e) {
          if (isLikelyNetworkError(e)) {
            const localUser = findLocalLoginUser(state.users, identifier, password);
            if (localUser) {
              setState((s) => ({ ...s, currentUserId: localUser.id }));
              return {
                ok: true,
                offline: true,
                message:
                  'No network. Signed in with credentials stored on this device. Sync when you are online.',
              };
            }
            return {
              ok: false,
              error:
                'No connection. If you saved an account on this phone before, use that email and password. Otherwise try again when online.',
            };
          }
          return { ok: false, error: apiErrorMessage(e) };
        }
      }
      const raw = identifier.trim();
      const emailMatch = raw.toLowerCase();
      const digits = raw.replace(/\D/g, '');
      const user = state.users.find((u) => {
        // Rows synced from the API have no local password; skip so seed rows or
        // offline-registered users with the same email can still match.
        if (u.password == null || u.password === '') return false;
        if (u.password !== password) return false;
        if (u.email.toLowerCase() === emailMatch) return true;
        const p = u.profile?.phone?.replace(/\D/g, '') || '';
        return digits.length >= 7 && p === digits;
      });
      if (!user) {
        const shadow = state.users.some((u) => {
          if (u.password != null && u.password !== '') return false;
          if (u.email.toLowerCase() === emailMatch) return true;
          const p = u.profile?.phone?.replace(/\D/g, '') || '';
          return digits.length >= 7 && p === digits;
        });
        if (shadow) {
          return {
            ok: false,
            error:
              'This email is tied to a server account. Turn on the API (VITE_USE_API=true in .env, backend running) and sign in with email and password.',
          };
        }
        return { ok: false, error: 'Invalid email, phone, or password.' };
      }
      setState((s) => ({ ...s, currentUserId: user.id }));
      return { ok: true };
    },
    [state.users, refreshFromApi],
  );

  const logout = useCallback(() => {
    if (API_ENABLED) {
      setStoredToken(null);
      setSessionResolving(false);
    }
    setState((s) => ({ ...s, currentUserId: null }));
  }, []);

  const requestPasswordReset = useCallback(
    async (email) => {
      const generic =
        'If an account exists for that email, you will receive reset instructions (or check with your admin if email is not configured).';
      if (API_ENABLED) {
        try {
          const data = await apiForgotPassword(String(email).trim().toLowerCase());
          const msg = data?.message || generic;
          const devUrl = data?.devResetLink;
          if (devUrl && typeof devUrl === 'string') {
            return { ok: true, message: msg, devResetUrl: devUrl };
          }
          return { ok: true, message: msg };
        } catch (e) {
          return { ok: false, error: apiErrorMessage(e) };
        }
      }
      const match = state.users.find(
        (u) => u.email.toLowerCase() === String(email).trim().toLowerCase(),
      );
      if (!match || match.password == null || match.password === '') {
        return { ok: true, message: generic, localResetPath: null };
      }
      const token = issuePasswordResetToken(email);
      const localResetPath = token ? `/auth/reset-password?token=${encodeURIComponent(token)}` : null;
      return {
        ok: true,
        message:
          'Your password can be reset below. In production, this link would be emailed to you.',
        localResetPath,
      };
    },
    [state.users],
  );

  const resetPasswordWithToken = useCallback(async (token, newPassword) => {
    if (API_ENABLED) {
      try {
        await apiResetPassword(token, newPassword);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: apiErrorMessage(e) };
      }
    }
    const email = consumePasswordResetToken(token);
    if (!email) return { ok: false, error: 'Invalid or expired reset link. Request a new one.' };
    setState((s) => ({
      ...s,
      users: s.users.map((u) =>
        u.email.toLowerCase() === email ? { ...u, password: newPassword } : u,
      ),
    }));
    return { ok: true };
  }, []);

  const register = useCallback(
    async (payload) => {
      const { email, password, role, name, phone, location } = payload;
      if (API_ENABLED) {
        try {
          await apiRegister({
            email: email.trim().toLowerCase(),
            password,
            role,
            name: name.trim(),
            phone: phone?.trim(),
            location: location?.trim(),
          });
          return { ok: true };
        } catch (e) {
          if (isLikelyNetworkError(e)) {
            if (state.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
              return { ok: false, error: 'Email already used on this device.' };
            }
            const id = `u-${Date.now()}`;
            const user = {
              id,
              email: email.trim(),
              password,
              role: normalizeAppRole(role),
              isPremium: false,
              subscriptionType: 'free',
              premiumUntil: null,
              profile: {
                name: name.trim(),
                phone: phone.trim(),
                location: location.trim(),
                suiAddress: '',
                receiveMoneyPhone: '',
                receiveMoneyName: '',
                bankDetails: '',
              },
            };
            setState((s) => ({
              ...s,
              users: [...s.users, user],
            }));
            return {
              ok: true,
              offline: true,
              message:
                'Registered on this device only (no network). Sign in online later to sync with the server, or keep using this local account.',
            };
          }
          return { ok: false, error: apiErrorMessage(e) };
        }
      }
      if (state.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        return { ok: false, error: 'Email already registered.' };
      }
      const id = `u-${Date.now()}`;
      const user = {
        id,
        email: email.trim(),
        password,
        role: normalizeAppRole(role),
        isPremium: false,
        subscriptionType: 'free',
        premiumUntil: null,
        profile: {
          name: name.trim(),
          phone: phone.trim(),
          location: location.trim(),
          suiAddress: '',
          receiveMoneyPhone: '',
          receiveMoneyName: '',
          bankDetails: '',
        },
      };
      setState((s) => ({
        ...s,
        users: [...s.users, user],
      }));
      return { ok: true };
    },
    [state.users],
  );

  const updateProfile = useCallback(
    async (profile) => {
      if (!state.currentUserId) return { ok: false };
      if (API_ENABLED) {
        try {
          const u = await apiUpdateProfile({
            name: profile.name,
            phone: profile.phone,
            location: profile.location,
            suiAddress: profile.suiAddress?.trim() || undefined,
            receiveMoneyPhone: profile.receiveMoneyPhone?.trim() || undefined,
            receiveMoneyName: profile.receiveMoneyName?.trim() || undefined,
            bankDetails: profile.bankDetails?.trim() || undefined,
          });
          const user = mapApiUserToState(u);
          const sui = profile.suiAddress?.trim() ?? user.profile.suiAddress ?? '';
          setState((s) => ({
            ...s,
            users: s.users.map((x) =>
              x.id === user.id
                ? { ...x, ...user, profile: { ...user.profile, ...profile, suiAddress: sui || user.profile.suiAddress } }
                : x,
            ),
          }));
          return { ok: true };
        } catch (e) {
          if (isLikelyNetworkError(e)) {
            setState((s) => ({
              ...s,
              users: s.users.map((u) =>
                u.id === s.currentUserId
                  ? { ...u, profile: { ...u.profile, ...profile, suiAddress: profile.suiAddress?.trim() ?? u.profile.suiAddress } }
                  : u,
              ),
            }));
            return {
              ok: true,
              offline: true,
              message: 'Profile updated on this device. It will sync with the server when you are online.',
            };
          }
          return { ok: false, error: apiErrorMessage(e) };
        }
      }
      setState((s) => ({
        ...s,
        users: s.users.map((u) =>
          u.id === s.currentUserId ? { ...u, profile: { ...u.profile, ...profile } } : u,
        ),
      }));
      return { ok: true };
    },
    [state.currentUserId],
  );

  const addHarvest = useCallback(async (row) => {
    if (!state.currentUserId) return { ok: false, error: 'Not signed in.' };

    if (API_ENABLED) {
      try {
        const farmId = procurementFarmRestId(row.farmId);
        const ppg = row.pricePerKg != null && row.pricePerKg !== '' ? Math.max(0, Number(row.pricePerKg)) : 0;
        const created = await createProcurement({
          produce: row.produceName.trim(),
          quantity: Number(row.tonnage),
          price: ppg * 1000,
          pricePerKgUgx: ppg,
          variety: (row.variety || '').trim() || undefined,
          qualityGrade: (row.qualityGrade || '').trim() || undefined,
          pricingNote: (row.pricingNote || '').trim() || undefined,
          farmLocation: row.farmLocation.trim(),
          userId: state.currentUserId,
          date: row.date,
          ...(farmId ? { farmId } : {}),
          ...(row.imageDataUrl
            ? { photoDataUrl: row.imageDataUrl }
            : {}),
        });
        const harvest = mapProcurementToHarvest(created);
        setState((s) => ({ ...s, harvests: [...s.harvests, harvest] }));
        return { ok: true };
      } catch (e) {
        if (!isLikelyNetworkError(e)) {
          const err = e.response?.data?.error || e.message || 'Failed to save harvest.';
          return { ok: false, error: err };
        }
        /* fall through: save locally when offline */
      }
    }

    const id = `h-${Date.now()}`;
    const ppg = row.pricePerKg != null && row.pricePerKg !== '' ? Math.max(0, Number(row.pricePerKg)) : 0;
    const harvest = {
      id,
      userId: state.currentUserId,
      farmId: row.farmId || null,
      produceName: row.produceName.trim(),
      tonnage: Number(row.tonnage),
      price: ppg * 1000,
      variety: (row.variety || '').trim() || '',
      qualityGrade: (row.qualityGrade || '').trim() || '',
      pricePerKgUgx: ppg,
      pricingNote: (row.pricingNote || '').trim() || '',
      date: row.date,
      farmLocation: row.farmLocation.trim(),
      latitude: row.latitude != null && row.latitude !== '' ? Number(row.latitude) : null,
      longitude: row.longitude != null && row.longitude !== '' ? Number(row.longitude) : null,
      imageDataUrl:
        row.imageDataUrl && row.imageDataUrl.length < 400000 ? row.imageDataUrl : null,
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, harvests: [...s.harvests, harvest] }));
    return { ok: true };
  }, [state.currentUserId]);

  const updateHarvest = useCallback(
    async (harvestId, row) => {
      if (!state.currentUserId) return { ok: false, error: 'Not signed in.' };
      if (API_ENABLED && String(harvestId).startsWith('api-')) {
        try {
          const farmPatch = procurementFarmRestId(row.farmId);
          const ppg = row.pricePerKg != null && row.pricePerKg !== '' ? Math.max(0, Number(row.pricePerKg)) : 0;
          await updateProcurement(harvestId, {
            produce: row.produceName.trim(),
            quantity: Number(row.tonnage),
            farmLocation: (row.farmLocation || '').trim(),
            date: row.date,
            price: ppg * 1000,
            pricePerKgUgx: ppg,
            variety: (row.variety || '').trim() || null,
            qualityGrade: (row.qualityGrade || '').trim() || null,
            pricingNote: (row.pricingNote || '').trim() || null,
            ...(row.farmId !== undefined
              ? { farmId: farmPatch != null ? farmPatch : null }
              : {}),
            ...(row.imageDataUrl !== undefined
              ? { photoDataUrl: row.imageDataUrl || null }
              : {}),
          });
          await refreshFromApi();
          return { ok: true };
        } catch (e) {
          if (!isLikelyNetworkError(e)) {
            return { ok: false, error: apiErrorMessage(e) };
          }
          /* offline: update local copy */
        }
      }
      setState((s) => ({
        ...s,
        harvests: s.harvests.map((h) =>
          h.id !== harvestId
            ? h
            : {
                ...h,
                produceName: row.produceName.trim(),
                tonnage: Number(row.tonnage),
                price: (() => {
                  const ppg =
                    row.pricePerKg != null && row.pricePerKg !== ''
                      ? Math.max(0, Number(row.pricePerKg))
                      : null;
                  if (ppg != null) return ppg * 1000;
                  return h.price ?? 0;
                })(),
                variety: row.variety != null ? String(row.variety).trim() : h.variety ?? '',
                qualityGrade: row.qualityGrade != null ? String(row.qualityGrade).trim() : h.qualityGrade ?? '',
                pricePerKgUgx: (() => {
                  if (row.pricePerKg != null && row.pricePerKg !== '') {
                    return Math.max(0, Number(row.pricePerKg));
                  }
                  return h.pricePerKgUgx ?? 0;
                })(),
                pricingNote: row.pricingNote != null ? String(row.pricingNote).trim() : h.pricingNote ?? '',
                date: row.date,
                farmLocation: (row.farmLocation || '').trim(),
                farmId: row.farmId !== undefined ? row.farmId || null : h.farmId,
                latitude:
                  row.latitude !== undefined && row.latitude !== ''
                    ? Number(row.latitude)
                    : h.latitude,
                longitude:
                  row.longitude !== undefined && row.longitude !== ''
                    ? Number(row.longitude)
                    : h.longitude,
                imageDataUrl:
                  row.imageDataUrl !== undefined ? row.imageDataUrl : h.imageDataUrl,
              },
        ),
      }));
      return { ok: true };
    },
    [state.currentUserId, refreshFromApi],
  );

  const deleteHarvest = useCallback(
    async (harvestId) => {
      if (API_ENABLED && String(harvestId).startsWith('api-')) {
        try {
          await deleteProcurement(harvestId);
          await refreshFromApi();
          return { ok: true };
        } catch (e) {
          if (!isLikelyNetworkError(e)) {
            return { ok: false, error: apiErrorMessage(e) };
          }
          /* offline: remove locally */
        }
      }
      setState((s) => ({
        ...s,
        harvests: s.harvests.filter((h) => h.id !== harvestId),
      }));
      return { ok: true };
    },
    [refreshFromApi],
  );

  const setUserRole = useCallback((userId, role) => {
    if (API_ENABLED) {
      return {
        ok: false,
        error: 'Role changes require an admin endpoint on the API (not wired in this build).',
      };
    }
    if (!['farmer', 'trader', 'admin'].includes(role)) return { ok: false, error: 'Invalid role' };
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === userId ? { ...u, role } : u)),
    }));
    return { ok: true };
  }, []);

  const addFarm = useCallback(
    async (row) => {
      if (!state.currentUserId) return { ok: false, error: 'Not signed in.' };

      const lat =
        row.latitude != null && row.latitude !== '' ? Number(row.latitude) : null;
      const lng =
        row.longitude != null && row.longitude !== '' ? Number(row.longitude) : null;

      if (API_ENABLED) {
        try {
          const created = await createFarm({
            name: row.name.trim(),
            address: (row.address && String(row.address).trim()) || '',
            latitude: lat,
            longitude: lng,
            userId: state.currentUserId,
          });
          const farm = mapFarmFromApi(created);
          setState((s) => ({ ...s, farms: [...(s.farms || []), farm] }));
          return { ok: true };
        } catch (e) {
          if (!isLikelyNetworkError(e)) {
            return { ok: false, error: apiErrorMessage(e) };
          }
        }
      }

      const id = `farm-${Date.now()}`;
      setState((s) => ({
        ...s,
        farms: [
          ...(s.farms || []),
          {
            id,
            userId: state.currentUserId,
            name: row.name.trim(),
            address: (row.address && String(row.address).trim()) || '',
            latitude: lat,
            longitude: lng,
          },
        ],
      }));
      return { ok: true };
    },
    [state.currentUserId],
  );

  const addSeasonalPlan = useCallback(
    async (row) => {
      if (!state.currentUserId) return { ok: false };
      const farmId = procurementFarmRestId(row.farmId);
      if (API_ENABLED) {
        try {
          const created = await createSeasonalPlan({
            crop: row.crop.trim(),
            plantDate: row.plantDate,
            expectedHarvestDate: row.expectedHarvestDate,
            farmId: farmId ?? null,
            notes: (row.notes && String(row.notes).trim()) || '',
          });
          const plan = mapSeasonalPlanFromApi(created);
          setState((s) => ({
            ...s,
            seasonalPlans: [...(s.seasonalPlans || []), plan],
          }));
          return { ok: true };
        } catch (e) {
          if (!isLikelyNetworkError(e)) {
            return { ok: false, error: apiErrorMessage(e) };
          }
        }
      }
      const id = `sp-${Date.now()}`;
      setState((s) => ({
        ...s,
        seasonalPlans: [
          ...(s.seasonalPlans || []),
          {
            id,
            userId: state.currentUserId,
            crop: row.crop.trim(),
            plantDate: row.plantDate,
            expectedHarvestDate: row.expectedHarvestDate,
            farmId: row.farmId || null,
            notes: (row.notes && String(row.notes).trim()) || '',
          },
        ],
      }));
      return { ok: true };
    },
    [state.currentUserId],
  );

  const updateSeasonalPlan = useCallback(
    async (id, row) => {
      if (!state.currentUserId) return { ok: false };
      const farmId = procurementFarmRestId(row.farmId);
      const body = {
        crop: row.crop.trim(),
        plantDate: row.plantDate,
        expectedHarvestDate: row.expectedHarvestDate,
        farmId: farmId ?? null,
        notes: (row.notes && String(row.notes).trim()) || '',
      };
      if (API_ENABLED && seasonalPlanRestId(id)) {
        try {
          const updated = await patchSeasonalPlan(id, body);
          const plan = mapSeasonalPlanFromApi(updated);
          setState((s) => ({
            ...s,
            seasonalPlans: (s.seasonalPlans || []).map((p) => (p.id === id ? plan : p)),
          }));
          return { ok: true };
        } catch (e) {
          if (!isLikelyNetworkError(e)) {
            return { ok: false, error: apiErrorMessage(e) };
          }
        }
      }
      setState((s) => ({
        ...s,
        seasonalPlans: (s.seasonalPlans || []).map((p) =>
          p.id === id
            ? {
                ...p,
                crop: row.crop.trim(),
                plantDate: row.plantDate,
                expectedHarvestDate: row.expectedHarvestDate,
                farmId: row.farmId || null,
                notes: (row.notes && String(row.notes).trim()) || '',
              }
            : p,
        ),
      }));
      return { ok: true };
    },
    [state.currentUserId],
  );

  const deleteSeasonalPlan = useCallback(async (id) => {
    if (!state.currentUserId) return { ok: false };
    if (API_ENABLED && seasonalPlanRestId(id)) {
      try {
        await deleteSeasonalPlanById(id);
        setState((s) => ({
          ...s,
          seasonalPlans: (s.seasonalPlans || []).filter((p) => p.id !== id),
        }));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: apiErrorMessage(e) };
      }
    }
    setState((s) => ({
      ...s,
      seasonalPlans: (s.seasonalPlans || []).filter((p) => p.id !== id),
    }));
    return { ok: true };
  }, [state.currentUserId]);

  const markDebtPayment = useCallback(
    async (saleId, amountUg) => {
      const amt = Number(amountUg);
      if (!saleId || amt <= 0) return { ok: false, error: 'Invalid amount' };
      const sale = state.sales.find((x) => x.id === saleId);
      if (!sale) return { ok: false, error: 'Sale not found' };
      const prevPaid = sale.amountPaid ?? 0;
      const newPaid = Math.min(sale.totalPayment, prevPaid + amt);
      const paidInFull = newPaid >= sale.totalPayment;
      const nextStatus = paidInFull
        ? 'paid'
        : newPaid > 0 && newPaid < sale.totalPayment
          ? 'partial'
          : sale.paymentStatus;

      const applySms = (base) => {
        const farmer = base.users.find((u) => u.id === sale.userId);
        if (!farmer?.profile?.phone) return base;
        return appendSmsLog(
          base,
          farmer.profile.phone,
          paidInFull
            ? `AgriTrack: ${sale.buyerName} marked paid in full, UGX ${sale.totalPayment.toLocaleString()} (${sale.produceName}).`
            : `AgriTrack: Payment UGX ${amt.toLocaleString()} from ${sale.buyerName}. Balance UGX ${(sale.totalPayment - newPaid).toLocaleString()}.`,
          'payment_received',
          sale.userId,
        );
      };

      if (API_ENABLED && String(saleId).startsWith('api-')) {
        try {
          const updated = await patchSale(saleId, {
            amountPaid: newPaid,
            paymentStatus: nextStatus,
          });
          const mapped = mapSaleFromApi(updated);
          setState((s) =>
            applySms({
              ...s,
              sales: s.sales.map((x) => (x.id === saleId ? { ...x, ...mapped } : x)),
            }),
          );
          return { ok: true };
        } catch (e) {
          if (!isLikelyNetworkError(e)) {
            return { ok: false, error: apiErrorMessage(e) };
          }
          /* offline: apply payment locally */
        }
      }

      setState((s) =>
        applySms({
          ...s,
          sales: s.sales.map((x) =>
            x.id !== saleId
              ? x
              : {
                  ...x,
                  amountPaid: newPaid,
                  paymentStatus: nextStatus,
                },
          ),
        }),
      );
      return { ok: true };
    },
    [state.sales],
  );

  const sendDebtReminderSms = useCallback((saleId) => {
    setState((s) => {
      const sale = s.sales.find((x) => x.id === saleId);
      if (!sale) return s;
      const farmer = s.users.find((u) => u.id === sale.userId);
      const out = sale.totalPayment - (sale.amountPaid || 0);
      if (!farmer?.profile?.phone || out <= 0) return s;
      return appendSmsLog(
        s,
        farmer.profile.phone,
        `AgriTrack REMINDER: ${sale.buyerName} owes UGX ${out.toLocaleString()} for ${sale.produceName}. Due: ${sale.creditDueDate || 'open'}.`,
        'debt_overdue',
        sale.userId,
      );
    });
  }, []);

  /** After a real devnet SUI transfer: store digest, mark UGX sale paid, append ledger row. */
  const recordOnchainDevnetPayment = useCallback(
    async (saleId, { digest, mist, sender, recipient }) => {
      if (!saleId || !digest) return { ok: false, error: 'Missing sale or transaction digest.' };
      const sale = state.sales.find((x) => x.id === saleId);
      if (!sale) return { ok: false, error: 'Sale not found.' };
      const outstanding = sale.totalPayment - (sale.amountPaid ?? 0);

      let apiMergedSale = null;
      if (API_ENABLED && String(saleId).startsWith('api-')) {
        try {
          if (sale.paymentStatus === 'pending') {
            const row = await confirmSaleSuiPayment(saleId, { digest });
            apiMergedSale = mapSaleFromApi(row);
          } else {
            await patchSale(saleId, {
              amountPaid: sale.totalPayment,
              paymentStatus: 'paid',
              suiTxDigest: digest,
            });
          }
        } catch (e) {
          if (!isLikelyNetworkError(e)) {
            return { ok: false, error: apiErrorMessage(e) };
          }
        }
      }

      const txLog = {
        id: `sui-${digest}`,
        type: 'sui_devnet',
        digest,
        mist: Number(mist),
        from: sender || '',
        to: recipient || '',
        saleId,
        status: 'success',
        timestamp: new Date().toISOString(),
        memo: `Devnet SUI transfer (${mist} MIST)`,
      };

      setState((s) => {
        let next = {
          ...s,
          walletTransactions: [...s.walletTransactions, txLog],
          sales: s.sales.map((x) => {
            if (x.id !== saleId) return x;
            if (apiMergedSale) {
              return {
                ...apiMergedSale,
                walletTxIds: [...(apiMergedSale.walletTxIds || []), ...(x.walletTxIds || [])],
                suiPaymentMist: Number(mist),
                suiPayerAddress: sender || null,
                suiPayeeAddress: recipient || null,
              };
            }
            return {
              ...x,
              amountPaid: x.totalPayment,
              paymentStatus: 'paid',
              suiTxDigest: digest,
              suiPaymentMist: Number(mist),
              suiPayerAddress: sender || null,
              suiPayeeAddress: recipient || null,
            };
          }),
        };
        const farmer = next.users.find((u) => u.id === sale.userId);
        if (farmer?.profile?.phone && outstanding > 0) {
          next = appendSmsLog(
            next,
            farmer.profile.phone,
            `AgriTrack: Devnet SUI payment confirmed (${digest.slice(0, 10)}…). UGX ledger marked paid (${sale.produceName}).`,
            'payment_received',
            sale.userId,
          );
        }
        return next;
      });

      return { ok: true };
    },
    [state.sales],
  );

  const advanceSupplyChain = useCallback(async (saleId, stage, note) => {
    const labels = {
      farm: 'Farm / origin',
      storage: 'Storage / cold chain',
      buyer: 'Delivered to buyer',
      payment: 'Payment completed',
    };
    const noteText = note || labels[stage] || stage;
    if (API_ENABLED) {
      try {
        const created = await createSupplyChainEvent({
          saleId: String(saleId),
          stage: String(stage),
          note: noteText,
        });
        const ev = mapSupplyEventFromApi(created);
        setState((s) => ({
          ...s,
          supplyChainEvents: [...(s.supplyChainEvents || []), ev],
        }));
        return;
      } catch {
        /* offline or server error: keep local step */
      }
    }
    setState((s) =>
      appendSupplyStep(s, saleId, stage, noteText, s.currentUserId),
    );
  }, []);

  const addExpense = useCallback(
    async (row) => {
      if (!state.currentUserId) return { ok: false };
      if (API_ENABLED) {
        try {
          const created = await createExpense({
            label: row.label.trim(),
            amount: Number(row.amount),
            date: row.date,
          });
          const exp = mapExpenseFromApi(created);
          setState((s) => ({
            ...s,
            expenses: [...(s.expenses || []), exp],
          }));
          return { ok: true };
        } catch (e) {
          if (!isLikelyNetworkError(e)) {
            return { ok: false, error: apiErrorMessage(e) };
          }
        }
      }
      const id = `e-${Date.now()}`;
      setState((s) => ({
        ...s,
        expenses: [
          ...(s.expenses || []),
          {
            id,
            userId: state.currentUserId,
            label: row.label.trim(),
            amount: Number(row.amount),
            date: row.date,
          },
        ],
      }));
      return { ok: true };
    },
    [state.currentUserId],
  );

  const addFarmDailyLog = useCallback(
    async (row) => {
      if (!state.currentUserId) return { ok: false, error: 'Not signed in.' };
      if (API_ENABLED) {
        try {
          const created = await createFarmDailyLog({
            logDate: row.logDate,
            activities: row.activities.trim(),
            expenseNote: row.expenseNote?.trim() || undefined,
            expenseAmount:
              row.expenseAmount != null && row.expenseAmount !== ''
                ? Number(row.expenseAmount)
                : undefined,
            issues: row.issues?.trim() || undefined,
            photoDataUrl: row.photoDataUrl || undefined,
          });
          setState((s) => ({
            ...s,
            farmDailyLogs: mergeFarmDailyLogsFromApi(s.farmDailyLogs, [created]),
          }));
          return { ok: true, log: mapFarmDailyLogFromApi(created) };
        } catch (e) {
          if (!isLikelyNetworkError(e)) {
            return { ok: false, error: apiErrorMessage(e) };
          }
        }
      }
      const id = `fdl-${Date.now()}`;
      const entry = {
        id,
        userId: state.currentUserId,
        logDate: row.logDate,
        activities: row.activities.trim(),
        expenseNote: row.expenseNote?.trim() || '',
        expenseAmount:
          row.expenseAmount != null && row.expenseAmount !== ''
            ? Number(row.expenseAmount)
            : null,
        issues: row.issues?.trim() || '',
        photoDataUrl: row.photoDataUrl || null,
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({
        ...s,
        farmDailyLogs: [...(s.farmDailyLogs || []), entry],
      }));
      return { ok: true, log: entry };
    },
    [state.currentUserId],
  );

  const addSale = useCallback(
    async (row) => {
      if (!state.currentUserId) return { ok: false, error: 'Not signed in.' };

      const totalPayment = Number(row.totalPayment);
      let amountPaid = Number(row.amountPaid ?? row.totalPayment);
      if (row.paymentStatus === 'credit') amountPaid = 0;
      if (row.paymentStatus === 'partial') {
        amountPaid = Math.min(amountPaid, totalPayment);
      }
      if (row.paymentStatus === 'paid') amountPaid = totalPayment;

      const st =
        row.paymentStatus === 'credit' ? 'credit' : 'mobile_money';

      const creditCheck = validateUgCreditLimits({
        sales: state.sales,
        farmerUserId: state.currentUserId,
        buyerName: row.buyerName.trim(),
        buyerUserId: undefined,
        totalPayment,
        paymentStatus: row.paymentStatus,
        amountPaid,
        settlementMethod: st,
      });
      if (!creditCheck.ok) return { ok: false, error: creditCheck.error };

      const feeBps = Number(import.meta.env.VITE_PLATFORM_FEE_BPS || 0);
      const feeSplit = platformFeeFromTotal(totalPayment, feeBps);

      const saleLocal = {
        id: `s-${Date.now()}`,
        userId: state.currentUserId,
        buyerName: row.buyerName.trim(),
        produceName: row.produceName.trim(),
        tonnage: Number(row.tonnage),
        totalPayment,
        paymentStatus: row.paymentStatus,
        settlementMethod: st,
        amountPaid,
        creditDueDate: row.creditDueDate || '',
        date: row.date,
        paymentProvider: row.paymentProvider?.trim() || null,
        paymentReference: row.paymentReference?.trim() || null,
        mobileMoneyVerifiedAt: null,
        platformFeeUgx: feeSplit.platformFeeUgx,
        farmerPayoutUgx: feeSplit.farmerPayoutUgx,
        walletTxIds: [],
        createdAt: new Date().toISOString(),
      };

      const ton = Number(saleLocal.tonnage);
      if (!Number.isFinite(ton) || ton <= 0) {
        return { ok: false, error: 'Enter a valid quantity (tonnes).' };
      }
      const avail = availableTonnesForUser(
        state.harvests,
        state.sales,
        state.currentUserId,
        saleLocal.produceName,
      );
      if (ton > avail + 1e-6) {
        return {
          ok: false,
          error: `Only ${avail.toFixed(2)} t of ${saleLocal.produceName} in stock. Add a harvest on My Farm or reduce this sale.`,
        };
      }

      if (API_ENABLED) {
        try {
          const created = await createSale({
            produce: saleLocal.produceName,
            quantity: saleLocal.tonnage,
            amount: saleLocal.totalPayment,
            buyer: saleLocal.buyerName,
            paymentStatus: saleLocal.paymentStatus,
            settlementMethod: st,
            amountPaid: saleLocal.amountPaid,
            creditDueDate: saleLocal.creditDueDate || null,
            userId: state.currentUserId,
            date: saleLocal.date,
            ...(saleLocal.paymentProvider
              ? { paymentProvider: saleLocal.paymentProvider }
              : {}),
            ...(saleLocal.paymentReference
              ? { paymentReference: saleLocal.paymentReference }
              : {}),
          });
          const sale = mapSaleFromApi(created);
          setState((s) => {
            let next = applyMockSuiToSale(s, sale, row);
            const farmer = next.users.find((u) => u.id === sale.userId);
            if (farmer?.profile?.phone) {
              next = appendSmsLog(
                next,
                farmer.profile.phone,
                `AgriTrack: Sale recorded. ${sale.buyerName}, UGX ${Number(sale.totalPayment).toLocaleString()} (${sale.produceName}).`,
                'sale_recorded',
                sale.userId,
              );
            }
            next = appendSupplyStep(next, sale.id, 'farm', 'Farm → origin / gate', sale.userId);
            return next;
          });
          return { ok: true };
        } catch (e) {
          if (!isLikelyNetworkError(e)) {
            const err = e.response?.data?.error || e.message || 'Failed to save sale.';
            return { ok: false, error: err };
          }
          /* offline: same as local-only save */
        }
      }

      setState((s) => {
        let next = applyMockSuiToSale(s, saleLocal, row);
        const farmer = next.users.find((u) => u.id === saleLocal.userId);
        if (farmer?.profile?.phone) {
          next = appendSmsLog(
            next,
            farmer.profile.phone,
            `AgriTrack: Sale recorded. ${saleLocal.buyerName}, UGX ${Number(saleLocal.totalPayment).toLocaleString()} (${saleLocal.produceName}).`,
            'sale_recorded',
            saleLocal.userId,
          );
        }
        next = appendSupplyStep(next, saleLocal.id, 'farm', 'Farm → origin / gate', saleLocal.userId);
        return next;
      });
      return { ok: true };
    },
    [state.currentUserId, state.harvests, state.sales],
  );

  /** Trader buys from marketplace: sale is owned by farmer (harvest.userId), buyer = current trader name */
  const recordTraderPurchase = useCallback(
    async (payload) => {
      if (!state.currentUserId) return { ok: false, error: 'Not signed in.' };
      const trader = state.users.find((u) => u.id === state.currentUserId);
      if (trader?.role !== 'trader') return { ok: false, error: 'Only traders can buy from the marketplace.' };

      const buyerName = trader.profile?.name?.trim();
      if (!buyerName) return { ok: false, error: 'Add your full name under Profile. It is used as the buyer name on sales.' };

      const {
        harvest,
        tonnage,
        totalPayment,
        settlementMethod: settlementRaw,
        paymentStatus: paymentRaw,
        amountPaid: amtPaidRaw,
        creditDueDate,
        date,
        paymentProvider,
        paymentReference,
        payerPhoneMsisdn,
      } = payload;
      const settlementMethod = settlementRaw || 'mobile_money';
      const farmerUserId = harvest?.userId;
      if (!farmerUserId) return { ok: false, error: 'This listing is not linked to a farmer account.' };

      const total = Number(totalPayment);
      const t = Number(tonnage);
      if (!Number.isFinite(total) || total <= 0) return { ok: false, error: 'Enter a valid total amount (UGX).' };
      if (!Number.isFinite(t) || t <= 0) return { ok: false, error: 'Enter a valid quantity (tonnes).' };

      let paymentStatus = paymentRaw ?? 'paid';
      let amountPaid = Number(amtPaidRaw ?? total);
      if (settlementMethod === 'sui') {
        paymentStatus = 'pending';
        amountPaid = 0;
      } else if (settlementMethod === 'credit') {
        paymentStatus = 'credit';
        amountPaid = 0;
      } else {
        if (paymentStatus === 'credit') amountPaid = 0;
        if (paymentStatus === 'partial') {
          amountPaid = Math.min(Number(amtPaidRaw ?? 0), total);
        }
        if (paymentStatus === 'paid') amountPaid = total;
      }

      const creditCheck = validateUgCreditLimits({
        sales: state.sales,
        farmerUserId,
        buyerName,
        buyerUserId: state.currentUserId,
        totalPayment: total,
        paymentStatus,
        amountPaid,
        settlementMethod,
      });
      if (!creditCheck.ok) return { ok: false, error: creditCheck.error };

      const feeBpsTr = Number(import.meta.env.VITE_PLATFORM_FEE_BPS || 0);
      const feeSplitTr = platformFeeFromTotal(total, feeBpsTr);

      const procurementId =
        harvest?.id != null && String(harvest.id).startsWith('api-')
          ? Number(String(harvest.id).slice(4))
          : undefined;

      const saleLocal = {
        id: `s-${Date.now()}`,
        userId: farmerUserId,
        buyerUserId: state.currentUserId,
        buyerName,
        produceName: String(harvest.produceName || '').trim(),
        tonnage: t,
        totalPayment: total,
        paymentStatus,
        settlementMethod,
        amountPaid,
        creditDueDate: creditDueDate || '',
        date,
        paymentProvider: paymentProvider || null,
        paymentReference: paymentReference || null,
        payerPhoneMsisdn: payerPhoneMsisdn?.trim() || null,
        mobileMoneyVerifiedAt: null,
        platformFeeUgx: feeSplitTr.platformFeeUgx,
        farmerPayoutUgx: feeSplitTr.farmerPayoutUgx,
        walletTxIds: [],
        createdAt: new Date().toISOString(),
      };

      const availFarmer = availableTonnesForUser(
        state.harvests,
        state.sales,
        farmerUserId,
        saleLocal.produceName,
      );
      if (t > availFarmer + 1e-6) {
        return {
          ok: false,
          error: `Farmer only has ${availFarmer.toFixed(2)} t of ${saleLocal.produceName} available. Lower quantity or ask them to record harvests.`,
        };
      }

      const row = {
        buyerName,
        produceName: saleLocal.produceName,
        tonnage: t,
        totalPayment: total,
        paymentStatus,
        settlementMethod,
        amountPaid,
        creditDueDate,
        date,
        paymentProvider,
        paymentReference,
      };

      if (API_ENABLED) {
        try {
          const created = await createSale({
            produce: saleLocal.produceName,
            quantity: saleLocal.tonnage,
            amount: saleLocal.totalPayment,
            buyer: saleLocal.buyerName,
            paymentStatus: saleLocal.paymentStatus,
            settlementMethod: saleLocal.settlementMethod,
            amountPaid: saleLocal.amountPaid,
            creditDueDate: saleLocal.creditDueDate || null,
            userId: farmerUserId,
            date: saleLocal.date,
            ...(saleLocal.paymentProvider
              ? { paymentProvider: saleLocal.paymentProvider }
              : {}),
            ...(saleLocal.paymentReference
              ? { paymentReference: saleLocal.paymentReference }
              : {}),
            ...(saleLocal.payerPhoneMsisdn
              ? { payerPhoneMsisdn: saleLocal.payerPhoneMsisdn }
              : {}),
            ...(procurementId != null && Number.isFinite(procurementId)
              ? { procurementId }
              : {}),
          });
          const sale = mapSaleFromApi(created);
          setState((s) => {
            let next = applyMockSuiToSale(s, sale, { ...row, mockSuiAmount: payload.mockSuiAmount });
            const farmer = next.users.find((u) => u.id === sale.userId);
            if (farmer?.profile?.phone) {
              next = appendSmsLog(
                next,
                farmer.profile.phone,
                `AgriTrack: ${sale.buyerName} purchased ${sale.produceName}, UGX ${Number(sale.totalPayment).toLocaleString()} (${sale.paymentStatus === 'pending' ? 'pending Sui' : 'marketplace'}).`,
                'sale_recorded',
                sale.userId,
              );
            }
            next = appendSupplyStep(next, sale.id, 'farm', 'Marketplace purchase', sale.userId);
            return next;
          });
          return { ok: true, sale };
        } catch (e) {
          if (isLikelyNetworkError(e)) {
            /* offline: record locally */
          } else {
            const err = e.response?.data?.message || e.response?.data?.error || apiErrorMessage(e);
            return {
              ok: false,
              error:
                e.response?.status === 403
                  ? `${err} (API may only allow farmers to POST sales. Use offline mode or extend the backend for trader checkout.)`
                  : err || 'Failed to record purchase.',
            };
          }
        }
      }

      setState((s) => {
        let next = applyMockSuiToSale(s, saleLocal, { ...row, mockSuiAmount: payload.mockSuiAmount });
        const farmer = next.users.find((u) => u.id === farmerUserId);
        if (farmer?.profile?.phone) {
          next = appendSmsLog(
            next,
            farmer.profile.phone,
            `AgriTrack: ${buyerName} purchased ${saleLocal.produceName}, UGX ${total.toLocaleString()} (marketplace).`,
            'sale_recorded',
            farmerUserId,
          );
        }
        next = appendSupplyStep(next, saleLocal.id, 'farm', 'Marketplace purchase', farmerUserId);
        return next;
      });
      return { ok: true, sale: saleLocal };
    },
    [state.currentUserId, state.users, state.harvests, state.sales],
  );

  const connectWalletMock = useCallback(() => {
    const address = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)).join('')}`;
    setState((s) => ({
      ...s,
      wallet: {
        connected: true,
        address,
        balanceSUI: s.wallet.balanceSUI > 0 ? s.wallet.balanceSUI : 50,
      },
    }));
  }, []);

  const disconnectWallet = useCallback(() => {
    setState((s) => ({
      ...s,
      wallet: { connected: false, address: '', balanceSUI: s.wallet.balanceSUI },
    }));
  }, []);

  const sendSUIMock = useCallback((toLabel, amountSUI, memo) => {
    const amt = Number(amountSUI);
    if (!state.wallet.connected || amt <= 0) return { ok: false, error: 'Invalid' };
    if (amt > state.wallet.balanceSUI) return { ok: false, error: 'Insufficient SUI (mock).' };
    const txId = `wtx-${Date.now()}`;
    setState((s) => ({
      ...s,
      wallet: { ...s.wallet, balanceSUI: Number((s.wallet.balanceSUI - amt).toFixed(4)) },
      walletTransactions: [
        ...s.walletTransactions,
        {
          id: txId,
          type: 'send',
          amountSUI: amt,
          from: s.wallet.address.slice(0, 10) + '…',
          to: toLabel,
          status: 'confirmed',
          timestamp: new Date().toISOString(),
          memo: memo || '',
        },
      ],
    }));
    return { ok: true, txId };
  }, [state.wallet]);

  const receiveSUIMock = useCallback((fromLabel, amountSUI, memo) => {
    const amt = Number(amountSUI);
    if (!state.wallet.connected || amt <= 0) return { ok: false };
    const txId = `wtx-${Date.now()}`;
    setState((s) => ({
      ...s,
      wallet: { ...s.wallet, balanceSUI: Number((s.wallet.balanceSUI + amt).toFixed(4)) },
      walletTransactions: [
        ...s.walletTransactions,
        {
          id: txId,
          type: 'receive',
          amountSUI: amt,
          from: fromLabel,
          to: s.wallet.address.slice(0, 10) + '…',
          status: 'confirmed',
          timestamp: new Date().toISOString(),
          memo: memo || '',
        },
      ],
    }));
    return { ok: true, txId };
  }, [state.wallet]);

  const linkSalePayment = useCallback((saleId, amountSUI, options = {}) => {
    const amt = Number(amountSUI);
    const settleUgxFull = options.settleUgxFull === true;
    if (!state.wallet.connected || amt <= 0 || !saleId) return { ok: false };
    const txId = `wtx-${Date.now()}`;
    setState((s) => {
      const sale = s.sales.find((x) => x.id === saleId);
      if (!sale) return s;
      const tx = {
        id: txId,
        type: 'sale_link',
        amountSUI: amt,
        from: 'linked',
        to: sale.userId,
        saleId,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        memo: settleUgxFull ? 'SUI link + UGX ledger settled' : 'Linked to sale',
      };
      const hadOutstanding = sale.totalPayment - (sale.amountPaid ?? 0) > 0;
      const sales = s.sales.map((x) => {
        if (x.id !== saleId) return x;
        let row = { ...x, walletTxIds: [...x.walletTxIds, txId] };
        if (settleUgxFull && hadOutstanding) {
          row = {
            ...row,
            amountPaid: sale.totalPayment,
            paymentStatus: 'paid',
          };
        }
        return row;
      });
      let next = {
        ...s,
        walletTransactions: [...s.walletTransactions, tx],
        wallet: {
          ...s.wallet,
          balanceSUI: Number((s.wallet.balanceSUI + amt * 0.995).toFixed(4)),
        },
        sales,
      };
      if (settleUgxFull && hadOutstanding) {
        const farmer = next.users.find((u) => u.id === sale.userId);
        if (farmer?.profile?.phone) {
          next = appendSmsLog(
            next,
            farmer.profile.phone,
            `AgriTrack: ${sale.buyerName}, UGX settled in full (${sale.produceName}) after wallet link.`,
            'payment_received',
            sale.userId,
          );
        }
      }
      return next;
    });
    return { ok: true, txId };
  }, [state.wallet.connected]);

  const createEscrowMock = useCallback((saleId, amountSUI) => {
    const amt = Number(amountSUI);
    const sale = state.sales.find((x) => x.id === saleId);
    if (!sale || !state.wallet.connected || amt <= 0) return { ok: false };
    const escrowId = `esc-${Date.now()}`;
    const txId = `wtx-${Date.now()}`;
    setState((s) => ({
      ...s,
      escrows: [
        ...s.escrows,
        {
          id: escrowId,
          saleId,
          amountSUI: amt,
          status: 'locked',
          note: 'Pay farmer after delivery (Sui contract, simulation)',
        },
      ],
      walletTransactions: [
        ...s.walletTransactions,
        {
          id: txId,
          type: 'escrow_lock',
          amountSUI: amt,
          from: s.wallet.address.slice(0, 10) + '…',
          to: `escrow:${escrowId.slice(0, 8)}`,
          saleId,
          status: 'locked',
          timestamp: new Date().toISOString(),
          memo: 'Funds locked in escrow',
        },
      ],
      wallet: {
        ...s.wallet,
        balanceSUI: Number((s.wallet.balanceSUI - amt).toFixed(4)),
      },
    }));
    return { ok: true, escrowId };
  }, [state.sales, state.wallet]);

  const releaseEscrowMock = useCallback((escrowId) => {
    setState((s) => {
      const esc = s.escrows.find((e) => e.id === escrowId);
      if (!esc || esc.status !== 'locked') return s;
      const sale = s.sales.find((x) => x.id === esc.saleId);
      const farmer = s.users.find((u) => u.id === sale?.userId);
      const releaseTx = `wtx-${Date.now()}`;
      const hadOutstanding = sale && sale.totalPayment - (sale.amountPaid ?? 0) > 0;
      const sales =
        sale && hadOutstanding
          ? s.sales.map((x) =>
              x.id === sale.id
                ? { ...x, amountPaid: sale.totalPayment, paymentStatus: 'paid' }
                : x,
            )
          : s.sales;
      let next = {
        ...s,
        sales,
        escrows: s.escrows.map((e) =>
          e.id === escrowId ? { ...e, status: 'released' } : e,
        ),
        walletTransactions: [
          ...s.walletTransactions,
          {
            id: releaseTx,
            type: 'escrow_release',
            amountSUI: esc.amountSUI,
            from: `escrow:${escrowId.slice(0, 8)}`,
            to: farmer ? farmer.profile.name : 'farmer',
            saleId: esc.saleId,
            status: 'confirmed',
            timestamp: new Date().toISOString(),
            memo: 'Released to farmer after delivery (simulation)',
          },
        ],
        wallet: {
          ...s.wallet,
          balanceSUI: Number((s.wallet.balanceSUI + esc.amountSUI * 0.98).toFixed(4)),
        },
      };
      if (farmer?.profile?.phone && sale && hadOutstanding) {
        next = appendSmsLog(
          next,
          farmer.profile.phone,
          `AgriTrack: Escrow released. ${sale.buyerName} UGX ${sale.totalPayment.toLocaleString()} marked paid (${sale.produceName}).`,
          'payment_received',
          sale.userId,
        );
      }
      return next;
    });
  }, []);

  const markNotificationRead = useCallback((id) => {
    if (API_ENABLED) {
      void markNotificationReadKey(id).catch(() => {});
    }
    setState((s) => ({
      ...s,
      readNotifications: s.readNotifications.includes(id) ? s.readNotifications : [...s.readNotifications, id],
    }));
  }, []);

  const notifications = useMemo(() => {
    if (!currentUser) return [];
    const list = [];
    const threshold = 2;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const retentionDays = 14;
    const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const isFreshDate = (isoLike) => {
      const t = new Date(String(isoLike || '')).getTime();
      return Number.isFinite(t) && t >= cutoffMs;
    };

    const formatSaleLine = (s) => {
      const ugx = Math.round(Number(s.totalPayment) || 0).toLocaleString();
      const t = Number(s.tonnage || 0).toFixed(2);
      const st = s.paymentStatus || 'n/a';
      const d = s.date || 'n/a';
      return `${s.produceName || 'Produce'} · ${t} t · UGX ${ugx} · ${d} · ${st}`;
    };

    /** System-generated: recent sales (farmer / admin) and purchases (trader) */
    if (currentUser.role === 'farmer' || currentUser.role === 'admin') {
      [...visibleSales]
        .sort((a, b) => (String(a.date || '') < String(b.date || '') ? 1 : -1))
        .slice(0, 25)
        .forEach((s) => {
          list.push({
            id: `sys-sale-${s.id}`,
            level: 'info',
            title: `Sale: ${(s.buyerName || 'Buyer').trim()}`,
            detail: formatSaleLine(s),
            at: s.date || today,
          });
        });
    } else if (currentUser.role === 'trader') {
      purchasesAsBuyer.slice(0, 25).forEach((s) => {
        const seller = state.users.find((u) => u.id === s.userId);
        const sellerName = seller?.profile?.name || 'Farmer';
        list.push({
          id: `sys-purchase-${s.id}`,
          level: 'info',
          title: `Purchase: ${(s.produceName || 'Produce').trim()}`,
          detail: `From ${sellerName} · ${formatSaleLine(s)}`,
          at: s.date || today,
        });
      });
    }

    if (currentUser.role === 'farmer' || currentUser.role === 'admin') {
      Object.entries(stockByProduce).forEach(([produce, qty]) => {
        if (qty < threshold && qty >= 0) {
          list.push({
            id: `low-${produce}`,
            level: 'warn',
            title: `Low stock: ${produce}`,
            detail: `About ${qty.toFixed(2)} tonnes remaining.`,
            at: today,
          });
        }
        if (qty < 0) {
          list.push({
            id: `neg-${produce}`,
            level: 'error',
            title: `Oversold warning: ${produce}`,
            detail: 'Sales exceed recorded harvests for this produce.',
            at: today,
          });
        }
      });
    }

    if (currentUser.role === 'trader') {
      creditOwedAsBuyer.forEach((s) => {
        const outstanding = s.totalPayment - (s.amountPaid || 0);
        if (outstanding <= 0) return;
        const farmer = state.users.find((u) => u.id === s.userId);
        const due = s.creditDueDate && s.creditDueDate < today;
        const seller = farmer?.profile?.name || 'Farmer';
        list.push({
          id: `trader-owe-${s.id}`,
          level: due ? 'error' : 'warn',
          title: due ? 'Payment overdue to farmer' : 'Outstanding balance',
          detail: `${seller}, ${s.produceName}: UGX ${outstanding.toLocaleString()}${s.creditDueDate ? `, due ${s.creditDueDate}` : ''}.`,
          at: s.creditDueDate || s.date || today,
        });
      });
    } else {
      visibleSales.forEach((s) => {
        if (s.paymentStatus === 'credit' || s.paymentStatus === 'partial') {
          const due = s.creditDueDate && s.creditDueDate < today;
          const outstanding = s.totalPayment - (s.amountPaid || 0);
          if (outstanding > 0 && due) {
            list.push({
              id: `credit-${s.id}`,
              level: 'error',
              title: 'Credit / partial payment overdue',
              detail: `${s.buyerName}, ${s.produceName}: UGX ${outstanding.toLocaleString()} outstanding.`,
              at: s.creditDueDate || s.date || today,
            });
          } else if (outstanding > 0 && s.paymentStatus === 'partial') {
            list.push({
              id: `part-${s.id}`,
              level: 'warn',
              title: 'Partial payment reminder',
              detail: `${s.buyerName}, balance UGX ${outstanding.toLocaleString()}.`,
              at: s.date || today,
            });
          }
        }
      });
    }

    // Seasonal schedule notifications for farmers:
    // - 5 days before due date
    // - due date itself, from 05:00 local time
    if (currentUser.role === 'farmer') {
      seasonalReminders.forEach((r) => {
        const targetDate =
          r.type === 'plant' ? r.plan?.plantDate : r.plan?.expectedHarvestDate;
        const crop = r.plan?.crop || 'Crop';
        if (!targetDate) return;

        if (r.days === 5) {
          list.push({
            id: `seasonal-pre5-${r.type}-${r.plan?.id}-${targetDate}`,
            level: 'warn',
            title:
              r.type === 'plant'
                ? 'Upcoming planting reminder'
                : 'Upcoming harvest reminder',
            detail:
              r.type === 'plant'
                ? `${crop}: planting is due in 5 days (${targetDate}).`
                : `${crop}: expected harvest is in 5 days (${targetDate}).`,
            at: today,
          });
        }

        if (r.days === 0 && now.getHours() >= 5) {
          list.push({
            id: `seasonal-due-5am-${r.type}-${r.plan?.id}-${targetDate}`,
            level: 'error',
            title:
              r.type === 'plant'
                ? 'Planting due today'
                : 'Harvest due today',
            detail:
              r.type === 'plant'
                ? `${crop}: planting date is today (${targetDate}).`
                : `${crop}: expected harvest date is today (${targetDate}).`,
            at: today,
          });
        }
      });
    }

    return list
      .filter((n) => isFreshDate(n.at))
      .map(({ at, ...rest }) => rest);
  }, [
    stockByProduce,
    visibleSales,
    currentUser,
    creditOwedAsBuyer,
    state.users,
    purchasesAsBuyer,
    seasonalReminders,
  ]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !state.readNotifications.includes(n.id)).length,
    [notifications, state.readNotifications],
  );

  const dashboardStats = useMemo(() => {
    const totalStockTonnes = Object.values(stockByProduce).reduce((sum, v) => sum + Math.max(0, v), 0);
    const totalRevenue = visibleSales.reduce(
      (sum, s) => sum + Math.min(s.amountPaid ?? 0, s.totalPayment),
      0,
    );
    const totalExpenses = visibleExpenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalRevenue - totalExpenses;

    const salesByMonth = {};
    visibleSales.forEach((s) => {
      const month = (s.date || '').slice(0, 7);
      if (!month) return;
      const cash = Math.min(s.amountPaid ?? 0, s.totalPayment);
      salesByMonth[month] = (salesByMonth[month] || 0) + cash;
    });
    const trend = Object.entries(salesByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }));

    const now = new Date();
    const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthKey = ym(now);
    const prevAnchor = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = ym(prevAnchor);
    let revenueThisMonth = 0;
    let revenuePrevMonth = 0;
    visibleSales.forEach((s) => {
      const m = (s.date || '').slice(0, 7);
      const cash = Math.min(s.amountPaid ?? 0, s.totalPayment);
      if (m === thisMonthKey) revenueThisMonth += cash;
      if (m === prevMonthKey) revenuePrevMonth += cash;
    });
    const monthOverMonthPct =
      revenuePrevMonth > 0
        ? Math.round(((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 1000) / 10
        : null;

    return {
      totalStockTonnes,
      totalRevenue,
      totalExpenses,
      profit,
      trend,
      revenueThisMonth,
      revenuePrevMonth,
      monthOverMonthPct,
      monthLabelThis: thisMonthKey,
      monthLabelPrev: prevMonthKey,
      ...strategicAnalytics,
    };
  }, [stockByProduce, visibleSales, visibleExpenses, strategicAnalytics]);

  /** Merge a user payload from the API (e.g. after billing) into local state. */
  const applyServerUser = useCallback((u) => {
    if (!u) return;
    const user = mapApiUserToState(u);
    setState((s) => ({ ...s, users: mergeUsers(s.users, user) }));
  }, []);

  const value = useMemo(
    () => ({
      state,
      currentUser,
      isAdmin,
      visibleHarvests,
      visibleSales,
      visibleExpenses,
      visibleFarmDailyLogs,
      stockByProduce,
      stockLedger,
      wallet: state.wallet,
      walletTransactions: state.walletTransactions,
      escrows: state.escrows,
      notifications,
      unreadCount,
      mockSmsLog: state.mockSmsLog,
      dashboardStats,
      login,
      logout,
      register,
      requestPasswordReset,
      resetPasswordWithToken,
      updateProfile,
      addHarvest,
      updateHarvest,
      deleteHarvest,
      setUserRole,
      addSale,
      recordTraderPurchase,
      addExpense,
      addFarmDailyLog,
      connectWalletMock,
      disconnectWallet,
      sendSUIMock,
      receiveSUIMock,
      linkSalePayment,
      createEscrowMock,
      releaseEscrowMock,
      markNotificationRead,
      allUsers: state.users,
      readNotifications: state.readNotifications,
      apiEnabled: API_ENABLED,
      apiStatus,
      sessionResolving,
      refreshFromApi,
      applyServerUser,
      visibleFarms,
      visibleSeasonalPlans,
      visibleSupplyEvents,
      outstandingDebts,
      seasonalReminders,
      strategicAnalytics,
      addFarm,
      addSeasonalPlan,
      updateSeasonalPlan,
      deleteSeasonalPlan,
      markDebtPayment,
      recordOnchainDevnetPayment,
      sendDebtReminderSms,
      advanceSupplyChain,
      creditOwedAsBuyer,
      purchasesAsBuyer,
      marketplaceHarvests,
    }),
    [
      state,
      currentUser,
      isAdmin,
      visibleHarvests,
      visibleSales,
      visibleExpenses,
      visibleFarmDailyLogs,
      visibleFarms,
      visibleSeasonalPlans,
      visibleSupplyEvents,
      outstandingDebts,
      creditOwedAsBuyer,
      purchasesAsBuyer,
      marketplaceHarvests,
      seasonalReminders,
      strategicAnalytics,
      stockByProduce,
      stockLedger,
      notifications,
      unreadCount,
      dashboardStats,
      login,
      logout,
      register,
      requestPasswordReset,
      resetPasswordWithToken,
      updateProfile,
      addHarvest,
      updateHarvest,
      deleteHarvest,
      setUserRole,
      addSale,
      recordTraderPurchase,
      addExpense,
      addFarmDailyLog,
      addFarm,
      addSeasonalPlan,
      updateSeasonalPlan,
      deleteSeasonalPlan,
      markDebtPayment,
      recordOnchainDevnetPayment,
      sendDebtReminderSms,
      advanceSupplyChain,
      connectWalletMock,
      disconnectWallet,
      sendSUIMock,
      receiveSUIMock,
      linkSalePayment,
      createEscrowMock,
      releaseEscrowMock,
      markNotificationRead,
      apiStatus,
      sessionResolving,
      refreshFromApi,
      applyServerUser,
    ],
  );

  return (
    <AgriTrackContext.Provider value={value}>
      {children}
    </AgriTrackContext.Provider>
  );
}

export function useAgriTrack() {
  const ctx = useContext(AgriTrackContext);
  if (!ctx) throw new Error('useAgriTrack must be used within AgriTrackProvider');
  return ctx;
}
