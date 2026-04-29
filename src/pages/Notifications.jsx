import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Check, BellRing, MessageSquareText, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAgriTrack } from '../context/AgriTrackContext';

function smsKindLabel(kind, t) {
  switch (kind) {
    case 'sale_recorded':
      return t('notificationsPage.smsKindSale');
    case 'payment_received':
      return t('notificationsPage.smsKindPayment');
    case 'debt_overdue':
      return t('notificationsPage.smsKindDebt');
    default:
      return t('notificationsPage.smsKindOther');
  }
}

export default function Notifications() {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    readNotifications,
    mockSmsLog,
    currentUser,
  } = useAgriTrack();

  const sortedSms = useMemo(() => {
    const rows = Array.isArray(mockSmsLog) ? [...mockSmsLog] : [];
    return rows.sort((a, b) => (String(a.at) < String(b.at) ? 1 : -1));
  }, [mockSmsLog]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {t('nav.notifications')}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{t('notificationsPage.alertsLead')}</p>
          </div>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
            <BellRing className="size-4" aria-hidden />
            {unreadCount} {t('notificationsPage.newBadge')}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">{t('dashboard.alertsSection')}</h2>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {notifications.length} total
            </span>
          </div>

          <ul className="space-y-3">
            {notifications.map((n) => {
              const unread = !readNotifications.includes(n.id);
              const tone =
                n.level === 'danger'
                  ? 'border-red-200 bg-red-50'
                  : n.level === 'warn'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-blue-200 bg-blue-50';
              return (
                <li
                  key={n.id}
                  className={`rounded-xl border px-4 py-3 ${tone} ${unread ? 'ring-1 ring-emerald-300/70' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                      <p className="mt-1 text-sm text-slate-700">{n.detail}</p>
                    </div>
                    {unread ? (
                      <button
                        type="button"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50"
                        title={t('notificationsPage.markReadAria')}
                        aria-label={t('notificationsPage.markReadAria')}
                        onClick={() => markNotificationRead(n.id)}
                      >
                        <Check className="size-4" strokeWidth={2.5} aria-hidden />
                      </button>
                    ) : (
                      <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-slate-600">
                        {t('notificationsPage.readLabel')}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
            {notifications.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                {t('notificationsPage.noAlerts')}
              </li>
            ) : null}
          </ul>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-sm font-bold text-slate-900">Quick actions</h3>
            <div className="mt-3 space-y-2">
              {currentUser?.role === 'trader' ? (
                <>
                  <Link className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-50" to="/marketplace">
                    {t('notificationsPage.quickLinksMarketplace')}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <Link className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-50" to="/purchases">
                    {t('notificationsPage.quickLinksPurchases')}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </>
              ) : (
                <>
                  <Link className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-50" to="/stock">
                    {t('notificationsPage.quickLinksStock')}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <Link className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-50" to="/sales">
                    {t('notificationsPage.quickLinksSales')}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </>
              )}
              <Link className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-50" to="/debts">
                {t('notificationsPage.quickLinksDebts')}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <MessageSquareText className="size-4 text-emerald-700" aria-hidden />
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">{t('notificationsPage.smsLogTitle')}</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {t('notificationsPage.smsLogLead')}
        </p>

        <ul className="mt-4 space-y-2">
          {sortedSms.map((sms) => (
            <li key={sms.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">
                {smsKindLabel(sms.kind, t)} - {sms.to}
              </p>
              <p className="mt-1 text-sm text-slate-700">{sms.body}</p>
              <p className="mt-1 text-xs text-slate-500">{new Date(sms.at).toLocaleString()}</p>
            </li>
          ))}
          {sortedSms.length === 0 ? (
            <li className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              {t('notificationsPage.smsLogEmpty')}
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
