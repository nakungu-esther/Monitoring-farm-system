import React, { useEffect, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SCRIPT_ID = 'agritrack-google-translate-script';
const MARKER_ATTR = '[data-agritrack-google-translate]';

const INCLUDED_LANGUAGES =
  'af,am,ar,de,en,es,fr,ha,hi,it,ja,ko,ln,lg,ms,ny,pt,ru,rw,sn,sw,ur,wo,zh-CN,yo,zu';

const inited = new Set();

function initAllContainers() {
  const g = typeof window !== 'undefined' ? window.google : null;
  if (!g?.translate?.TranslateElement) return;
  const TE = g.translate.TranslateElement;

  document.querySelectorAll(MARKER_ATTR).forEach((node) => {
    const el = node;
    const id = el.id;
    if (!id || inited.has(id)) return;
    el.innerHTML = '';
    try {
      new TE(
        {
          pageLanguage: 'en',
          includedLanguages: INCLUDED_LANGUAGES,
          autoDisplay: false,
          layout: TE.InlineLayout?.SIMPLE ?? 0,
        },
        id,
      );
      inited.add(id);
    } catch {
      /* ignore */
    }
  });
}

function ensureGlobalCallback() {
  if (typeof window === 'undefined') return;
  window.googleTranslateElementInit = () => initAllContainers();
}

function ensureScript() {
  if (typeof document === 'undefined') return;
  ensureGlobalCallback();
  if (document.getElementById(SCRIPT_ID)) return;
  const s = document.createElement('script');
  s.id = SCRIPT_ID;
  s.async = true;
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.body.appendChild(s);
}

export default function GoogleTranslate() {
  const { t } = useTranslation();
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const eltId = `agritrack_gt_${reactId}`;
  useEffect(() => {
    ensureGlobalCallback();
    ensureScript();
    const t1 = window.setTimeout(() => {
      if (window.google?.translate) initAllContainers();
    }, 0);
    const t2 = window.setTimeout(() => {
      if (window.google?.translate) initAllContainers();
    }, 500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      inited.delete(eltId);
    };
  }, [eltId]);

  return (
    <div
      className="gt-wrap flex h-7 max-h-7 w-auto max-w-[10rem] shrink-0 items-center gap-1 rounded-md border border-zinc-200/90 bg-zinc-50/95 px-1 py-0.5 dark:border-zinc-600/80 dark:bg-zinc-900/90"
      title={t('topbar.translateHint')}
    >
      <span className="shrink-0 pl-0.5 text-[11px] font-semibold leading-none text-zinc-700 dark:text-zinc-200">
        {t('topbar.selectLanguage')}
      </span>
      <div className="relative min-h-0 min-w-0 max-w-[5.75rem] flex-1 sm:max-w-[6.5rem]">
        <div
          id={eltId}
          data-agritrack-google-translate=""
          className="gt-root gt-with-chevron h-6 min-h-0 w-full min-w-0 [&_.goog-te-gadget]:!text-[11px] [&_select]:!h-6 [&_select]:!min-h-0 [&_select]:!max-h-6 [&_select]:!py-0 [&_select]:!pl-1 [&_select]:!pr-5 [&_select]:!text-[11px] [&_select]:!leading-none"
        />
        <ChevronDown
          className="pointer-events-none absolute right-0 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
          strokeWidth={2.5}
          aria-hidden
        />
      </div>
    </div>
  );
}
