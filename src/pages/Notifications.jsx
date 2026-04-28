import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAgriTrack } from '../context/AgriTrackContext';
import { API_ENABLED } from '../config';
import { useToast } from '../context/ToastContext';
import { registerWebPush, unsubscribeWebPush } from '../utils/webPushClient';

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
  const { toast } = useToast();
  const [pushBusy, setPushBusy] = useState(false);

  const sortedSms = useMemo(() => {
    const rows = Array.isArray(mockSmsLog) ? [...mockSmsLog] : [];
    return rows.sort((a, b) => (String(a.at) < String(b.at) ? 1 : -1));
  }, [mockSmsLog]);

  const onEnablePush = async () => {
    if (!API_ENABLED) {
      toast(t('notificationsPage.pushApiRequired'), 'warn');
      return;
    }
    setPushBusy(true);
    try {
      const r = await registerWebPush();
      if (r === 'ok') {
        toast(t('notificationsPage.pushEnabled'), 'success');
      } else if (r === 'denied') {
        toast(t('notificationsPage.pushDenied'), 'warn');
      } else {
        toast(t('notificationsPage.pushUnavailable'), 'warn');
      }
    } catch (e) {
      toast(
        (e && e.message) || t('notificationsPage.pushFailed'),
        'error',
      );
    } finally {
      setPushBusy(false);
    }
  };

  const onDisablePush = async () => {
    setPushBusy(true);
    try {
      await unsubscribeWebPush();
      toast(t('notificationsPage.pushDisabled'), 'info');
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title mb-0">{t('nav.notifications')}</h1>
        {unreadCount > 0 ? (
          <span className="badge large">
            {unreadCount} {t('notificationsPage.newBadge')}
          </span>
        ) : null}
      </div>

      <p className="page-lead muted mt-2 max-w-2xl">{t('notificationsPage.alertsLead')}</p>

      <ul className="notif-list mt-6">
        {notifications.map((n) => {
          const unread = !readNotifications.includes(n.id);
          return (
            <li key={n.id} className={`notif-item ${n.level} ${unread ? 'unread' : ''}`}>
              <div>
                <strong>{n.title}</strong>
                <p className="small">{n.detail}</p>
              </div>
              {unread ? (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                  title={t('notificationsPage.markReadAria')}
                  aria-label={t('notificationsPage.markReadAria')}
                  onClick={() => markNotificationRead(n.id)}
                >
                  <Check className="size-4" strokeWidth={2.5} aria-hidden />
                </button>
              ) : (
                <span className="muted small">{t('notificationsPage.readLabel')}</span>
              )}
            </li>
          );
        })}
        {notifications.length === 0 ? (
          <li className="muted">{t('notificationsPage.noAlerts')}</li>
        ) : null}
      </ul>

      <section className="panel mt-8">
        <h2 className="panel-heading sm">{t('notificationsPage.smsLogTitle')}</h2>
        <p className="muted small mt-1 max-w-2xl">
          {t('notificationsPage.smsLogLead')}
        </p>
        <ul className="notif-list mt-4">
          {sortedSms.map((sms) => (
            <li key={sms.id} className="notif-item info">
              <div>
                <strong>
                  {smsKindLabel(sms.kind, t)} → {sms.to}
                </strong>
                <p className="small">{sms.body}</p>
                <p className="small muted">{new Date(sms.at).toLocaleString()}</p>
              </div>
            </li>
          ))}
          {sortedSms.length === 0 ? (
            <li className="muted small">{t('notificationsPage.smsLogEmpty')}</li>
          ) : null}
        </ul>
      </section>

      <p className="mt-6 flex flex-wrap gap-x-2 gap-y-1 text-sm">
        {currentUser?.role === 'trader' ? (
          <>
            <Link className="font-semibold text-emerald-700 hover:underline" to="/marketplace">
              {t('notificationsPage.quickLinksMarketplace')}
            </Link>
            <span className="text-zinc-400">·</span>
            <Link className="font-semibold text-emerald-700 hover:underline" to="/purchases">
              {t('notificationsPage.quickLinksPurchases')}
            </Link>
          </>
        ) : (
          <>
            <Link className="font-semibold text-emerald-700 hover:underline" to="/stock">
              {t('notificationsPage.quickLinksStock')}
            </Link>
            <span className="text-zinc-400">·</span>
            <Link className="font-semibold text-emerald-700 hover:underline" to="/sales">
              {t('notificationsPage.quickLinksSales')}
            </Link>
          </>
        )}
        <span className="text-zinc-400">·</span>
        <Link className="font-semibold text-emerald-700 hover:underline" to="/debts">
          {t('notificationsPage.quickLinksDebts')}
        </Link>
      </p>

      <section className="panel mt-10">
        <h2 className="panel-heading sm">{t('notificationsPage.pushTitle')}</h2>
        <p className="muted mt-1 text-sm max-w-xl">
          {t('page.notifications.sub')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={pushBusy}
            onClick={onEnablePush}
          >
            {pushBusy ? '…' : t('notificationsPage.pushEnable')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={pushBusy}
            onClick={onDisablePush}
          >
            {t('notificationsPage.pushDisable')}
          </button>
        </div>
      </section>
    </div>
  );
}
