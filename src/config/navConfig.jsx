import { normalizeAppRole } from '../utils/roles';
import {
  LayoutDashboard,
  Sprout,
  Boxes,
  ShoppingCart,
  Wallet,
  HandCoins,
  Bell,
  LogOut,
  Store,
  ClipboardList,
  CreditCard,
  Calendar,
  MapPin,
  Link2,
  BookOpen,
  Sparkles,
  CloudSun,
} from 'lucide-react';

/** @deprecated use welcome line with useTranslation in Dashboard */
export function welcomeSubtitle(currentUser) {
  if (!currentUser) return '';
  const panel =
    currentUser.role === 'admin'
      ? 'Admin console'
      : currentUser.role === 'trader'
        ? 'Trader panel'
        : 'Farmer workspace';
  const name = (currentUser.profile?.name || '').trim();
  const roleName =
    currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'trader' ? 'Trader' : 'Farmer';
  if (!name) return panel;
  if (name === roleName) return panel;
  return `${name} · ${panel}`;
}

/** Farmer: overview → production → inventory → selling → finance */
export const farmerNav = [
  { to: '/', labelKey: 'nav.dashboard', end: true, Icon: LayoutDashboard },
  { to: '/daily-log', labelKey: 'nav.dailyReport', Icon: BookOpen },
  { to: '/farm', labelKey: 'nav.myFarm', Icon: Sprout },
  { to: '/stock', labelKey: 'nav.stock', Icon: Boxes },
  { to: '/sales', labelKey: 'nav.sales', Icon: ShoppingCart },
  { to: '/wallet', labelKey: 'nav.wallet', Icon: Wallet },
  { to: '/debts', labelKey: 'nav.credit', Icon: HandCoins },
  { to: '/farms', labelKey: 'nav.farmsMap', Icon: MapPin },
  { to: '/seasonal', labelKey: 'nav.seasonal', Icon: Calendar },
  { to: '/weather', labelKey: 'nav.weatherPlanning', Icon: CloudSun },
  { to: '/upgrade', labelKey: 'nav.upgrade', Icon: Sparkles },
  { to: '/supply', labelKey: 'nav.supplyChain', Icon: Link2 },
];

/** Trader: browse → orders → payments */
export const traderNav = [
  { to: '/', labelKey: 'nav.dashboard', end: true, Icon: LayoutDashboard },
  { to: '/daily-log', labelKey: 'nav.farmReports', Icon: BookOpen },
  { to: '/marketplace', labelKey: 'nav.marketplace', Icon: Store },
  { to: '/orders', labelKey: 'nav.orders', Icon: ClipboardList },
  { to: '/purchases', labelKey: 'nav.purchases', Icon: ShoppingCart },
  { to: '/payments', labelKey: 'nav.payments', Icon: CreditCard },
  { to: '/wallet', labelKey: 'nav.wallet', Icon: Wallet },
  { to: '/debts', labelKey: 'nav.credit', Icon: HandCoins },
  { to: '/upgrade', labelKey: 'nav.upgrade', Icon: Sparkles },
];

export function getNavForRole(role) {
  const r = normalizeAppRole(role);
  if (r === 'trader') return traderNav;
  return farmerNav;
}

export const sharedFooterNav = [];

export { Bell, LogOut };
