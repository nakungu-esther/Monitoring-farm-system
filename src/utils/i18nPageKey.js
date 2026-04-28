/**
 * Map pathname to i18n page.* keys (see locales/.../translation.json).
 */
export function getPageKeyFromPath(pathname) {
  if (pathname.startsWith('/marketplace/listing')) return 'marketplace';
  if (pathname === '/daily-log') return 'dailyLog';
  const map = {
    '/': 'home',
    '/farm': 'farm',
    '/farms': 'farms',
    '/seasonal': 'seasonal',
    '/weather': 'weather',
    '/debts': 'debts',
    '/supply': 'supply',
    '/orders': 'orders',
    '/stock': 'stock',
    '/marketplace': 'marketplace',
    '/purchases': 'purchases',
    '/payments': 'payments',
    '/sales': 'sales',
    '/wallet': 'wallet',
    '/reports': 'reports',
    '/transactions': 'transactions',
    '/notifications': 'notifications',
    '/search': 'search',
    '/insights': 'insights',
    '/upgrade': 'upgrade',
    '/profile': 'profile',
    '/admin': 'admin',
    '/settings': 'settings',
  };
  return map[pathname] || 'fallback';
}
