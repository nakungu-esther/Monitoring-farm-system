const STORAGE_KEY = 'agritrack-color-scheme';

export function initColorScheme() {
  if (typeof document === 'undefined') return;

  const saved = localStorage.getItem(STORAGE_KEY);
  const scheme =
    saved === 'light' || saved === 'dark'
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

  document.documentElement.setAttribute('data-color-scheme', scheme);

  if (!saved) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (localStorage.getItem(STORAGE_KEY)) return;
      document.documentElement.setAttribute('data-color-scheme', e.matches ? 'dark' : 'light');
    });
  }
}

export function toggleStoredColorScheme() {
  const next =
    document.documentElement.getAttribute('data-color-scheme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-color-scheme', next);
  localStorage.setItem(STORAGE_KEY, next);
  return next;
}

export function isDarkScheme() {
  return document.documentElement.getAttribute('data-color-scheme') === 'dark';
}
