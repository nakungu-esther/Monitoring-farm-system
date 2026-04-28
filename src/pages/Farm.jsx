import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useToast } from '../context/ToastContext';
import { popupConfirm } from '../utils/popupAlerts';
import Modal from '../components/Modal';
import UgandaAddressPickers from '../components/UgandaAddressPickers';
import EmptyState from '../components/EmptyState';
import { PRODUCE_OPTIONS, resolveProduceOption } from '../constants/produce';
import { getVarietyOptionsForProduce } from '../constants/varietyOptions';
import { QUALITY_OPTIONS, effectivePricePerKgUgx, qualityLabel } from '../utils/harvestListing';
import { geocodePlaceName } from '../utils/geocodeAddress';
import { isNonEmptyTrimmed, isPositiveFinite, isValidIsoDateString } from '../utils/authValidation';
import { Pencil, Trash2 } from 'lucide-react';

export default function Farm() {
  const { t } = useTranslation();
  const { addHarvest, updateHarvest, deleteHarvest, visibleHarvests, visibleFarms, currentUser, apiEnabled } =
    useAgriTrack();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState(null);
  const [producePick, setProducePick] = useState(PRODUCE_OPTIONS[0]);
  const [customProduce, setCustomProduce] = useState('');
  const [form, setForm] = useState({
    farmId: '',
    tonnage: '',
    variety: '',
    qualityGrade: '',
    pricePerKg: '',
    pricingNote: '',
    date: new Date().toISOString().slice(0, 10),
    farmLocation: '',
    latitude: '',
    longitude: '',
    imageDataUrl: '',
  });
  const [geoBusy, setGeoBusy] = useState(false);

  const farmById = useMemo(() => {
    const m = {};
    visibleFarms.forEach((f) => {
      m[f.id] = f;
    });
    return m;
  }, [visibleFarms]);

  useEffect(() => {
    if (currentUser?.profile?.location) {
      setForm((f) => ({ ...f, farmLocation: f.farmLocation || currentUser.profile.location }));
    }
  }, [currentUser]);

  const produceName = producePick === 'Other' ? customProduce.trim() : producePick;

  const baseVarietyOptions = useMemo(
    () => getVarietyOptionsForProduce(producePick),
    [producePick],
  );
  const varietyOptions = useMemo(() => {
    const v = (form.variety || '').trim();
    if (v && !baseVarietyOptions.includes(v)) {
      return [v, ...baseVarietyOptions];
    }
    return baseVarietyOptions;
  }, [baseVarietyOptions, form.variety]);

  const onProducePickChange = (e) => {
    const next = e.target.value;
    setProducePick(next);
    setForm((f) => {
      const opts = getVarietyOptionsForProduce(next);
      if (f.variety && !opts.includes(f.variety)) {
        return { ...f, variety: '' };
      }
      return f;
    });
  };

  const onFarmChange = (farmId) => {
    setForm((f) => {
      const farm = farmId ? farmById[farmId] : null;
      return {
        ...f,
        farmId,
        farmLocation: farm ? (farm.address || farm.name || f.farmLocation) : f.farmLocation,
        latitude: farm?.latitude != null ? String(farm.latitude) : f.latitude,
        longitude: farm?.longitude != null ? String(farm.longitude) : f.longitude,
      };
    });
  };

  const useGps = () => {
    if (!navigator.geolocation) {
      toast(t('farmPage.toastGps'), 'warn');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: String(pos.coords.latitude.toFixed(6)),
          longitude: String(pos.coords.longitude.toFixed(6)),
        }));
        toast(t('farmPage.toastGpsOk'));
      },
      () => toast(t('farmPage.toastGpsBad'), 'warn'),
    );
  };

  const lookupCoordsFromLocationText = async () => {
    const q = form.farmLocation?.trim();
    if (!q) {
      toast(t('farmPage.toastLocFirst'), 'warn');
      return;
    }
    setGeoBusy(true);
    try {
      const g = await geocodePlaceName(q);
      if (g.ok) {
        setForm((f) => ({
          ...f,
          latitude: String(Number(g.latitude).toFixed(6)),
          longitude: String(Number(g.longitude).toFixed(6)),
        }));
        toast(g.label ? t('farmPage.toastFound', { label: g.label }) : t('farmPage.toastCoords'));
      } else {
        toast(g.error, 'warn');
      }
    } finally {
      setGeoBusy(false);
    }
  };

  const onImage = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast(t('farmPage.toastImage'), 'warn');
      return;
    }
    if (file.size > 1_500_000) {
      toast(t('farmPage.toastBig'), 'warn');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      if (url.length > 350_000) {
        toast(t('farmPage.toastBigPreview'), 'warn');
        return;
      }
      setForm((f) => ({ ...f, imageDataUrl: url }));
      toast(t('farmPage.toastPhoto'));
    };
    reader.readAsDataURL(file);
  };

  const openEdit = (h) => {
    const resolved = resolveProduceOption(h.produceName);
    const inList = PRODUCE_OPTIONS.includes(resolved);
    setProducePick(inList ? resolved : 'Other');
    setCustomProduce(inList ? '' : h.produceName);
    const ppg = effectivePricePerKgUgx(h);
    setForm({
      farmId: h.farmId || '',
      tonnage: String(h.tonnage),
      variety: h.variety || '',
      qualityGrade: (h.qualityGrade || '').toLowerCase(),
      pricePerKg: ppg > 0 ? String(Math.round(ppg)) : '',
      pricingNote: h.pricingNote || '',
      date: h.date,
      farmLocation: h.farmLocation || '',
      latitude: h.latitude != null ? String(h.latitude) : '',
      longitude: h.longitude != null ? String(h.longitude) : '',
      imageDataUrl: h.imageDataUrl || '',
    });
    setEditingHarvest(h);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingHarvest(null);
    setForm((f) => ({
      ...f,
      farmId: '',
      tonnage: '',
      variety: '',
      qualityGrade: '',
      pricePerKg: '',
      pricingNote: '',
      date: new Date().toISOString().slice(0, 10),
      latitude: '',
      longitude: '',
      imageDataUrl: '',
    }));
    setProducePick(PRODUCE_OPTIONS[0]);
    setCustomProduce('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (producePick === 'Other' && !customProduce.trim()) {
      toast(t('farmPage.toastEnterProduce'), 'warn');
      return;
    }
    if (!isPositiveFinite(form.tonnage)) {
      toast('Enter a valid tonnage greater than zero.', 'warn');
      return;
    }
    if (!isValidIsoDateString(form.date)) {
      toast('Choose a valid date.', 'warn');
      return;
    }
    if (!isNonEmptyTrimmed(form.farmLocation)) {
      toast('Enter a harvest location (district, village, landmark).', 'warn');
      return;
    }
    let lat = form.latitude;
    let lng = form.longitude;
    const loc = form.farmLocation?.trim();
    if (loc && (lat === '' || lng === '')) {
      setGeoBusy(true);
      try {
        const g = await geocodePlaceName(loc);
        if (g.ok) {
          lat = String(Number(g.latitude).toFixed(6));
          lng = String(Number(g.longitude).toFixed(6));
          if (g.label) toast(t('farmPage.toastCoordsInfo', { label: g.label }), 'info');
        } else {
          toast(g.error, 'warn');
        }
      } finally {
        setGeoBusy(false);
      }
    }
    const payload = {
      produceName,
      tonnage: form.tonnage,
      variety: form.variety,
      qualityGrade: form.qualityGrade,
      pricePerKg: form.pricePerKg,
      pricingNote: form.pricingNote,
      date: form.date,
      farmLocation: form.farmLocation,
      farmId: form.farmId || null,
      latitude: lat,
      longitude: lng,
      imageDataUrl: form.imageDataUrl || null,
    };
    if (editingHarvest) {
      const r = await updateHarvest(editingHarvest.id, payload);
      if (r?.ok === false) {
        toast(r.error || t('farmPage.errUpdate'), 'error');
        return;
      }
      toast(t('farmPage.harvestUpdated'));
      if (apiEnabled && String(editingHarvest.id).startsWith('api-')) {
        /* list refreshed via refreshFromApi inside context */
      }
      closeModal();
      return;
    }
    const r = await addHarvest(payload);
    if (r?.ok === false) {
      toast(r.error || t('farmPage.errSave'), 'error');
      return;
    }
    toast(t('farmPage.harvestSaved'));
    closeModal();
  };

  const onDelete = async (h) => {
    const res = await popupConfirm(
      'Delete this harvest?',
      apiEnabled && String(h.id).startsWith('api-')
        ? 'This will delete the row in the database when your API supports DELETE /api/procurements/:id.'
        : 'This removes the harvest from your records.',
      'Delete',
    );
    if (!res.isConfirmed) return;
    const r = await deleteHarvest(h.id);
    if (r?.ok === false) {
      toast(r.error || t('farmPage.errDelete'), 'error');
      return;
    }
    toast(t('farmPage.harvestRemoved'));
  };

  return (
    <div className="page">
      <div className="page-actions">
        <p className="page-lead muted" style={{ margin: 0, flex: 1 }}>
          Link each harvest to a
          {' '}
          <Link to="/farms">registered farm</Link>
          {' '}
          when possible — maps and trust signals follow.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingHarvest(null);
            setModalOpen(true);
          }}
        >
          + Add produce
        </button>
      </div>

      <div className="table-wrap card-like">
        <table className="data-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Produce</th>
              <th>Quantity</th>
              <th>UGX/kg</th>
              <th>Type</th>
              <th>Quality</th>
              <th>Date</th>
              <th>Farm</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleHarvests.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <EmptyState
                    icon="🌾"
                    title="No produce logged yet"
                    hint="Add a harvest — stock updates instantly."
                  />
                </td>
              </tr>
            ) : (
              visibleHarvests
                .slice()
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((h) => {
                  const farm = h.farmId ? farmById[h.farmId] : null;
                  return (
                    <tr key={h.id}>
                      <td>
                        {h.imageDataUrl ? (
                          <img src={h.imageDataUrl} alt="" className="harvest-thumb" />
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="fw-semibold">{h.produceName}</td>
                      <td className="tabular">{Number(h.tonnage).toFixed(2)} t</td>
                      <td className="tabular text-slate-700">
                        {effectivePricePerKgUgx(h) > 0
                          ? `UGX ${Math.round(effectivePricePerKgUgx(h)).toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="small max-w-[140px]">{h.variety || '—'}</td>
                      <td className="small">{qualityLabel(h.qualityGrade)}</td>
                      <td>{h.date}</td>
                      <td className="small">{farm?.name || '—'}</td>
                      <td className="small text-slate-700">
                        {h.farmLocation || farm?.address || farm?.name ? (
                          <>
                            <span className="font-semibold text-emerald-900">Farm: </span>
                            {[farm?.name, farm?.address, h.farmLocation].filter(Boolean).join(' · ')}
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="inline-tools wrap">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            title={t('farmPage.editHarvest')}
                            aria-label={t('farmPage.editHarvest')}
                            onClick={() => openEdit(h)}
                          >
                            <Pencil className="size-4" strokeWidth={2} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                            title={t('farmPage.deleteHarvest')}
                            aria-label={t('farmPage.deleteHarvest')}
                            onClick={() => onDelete(h)}
                          >
                            <Trash2 className="size-4" strokeWidth={2} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>

      <Modal title={editingHarvest ? 'Edit harvest' : 'Add produce'} isOpen={modalOpen} onClose={closeModal}>
        <form onSubmit={onSubmit} className="modal-form" noValidate>
          <label className="auth-field">
            <span className="auth-label">Linked farm</span>
            <select
              value={form.farmId}
              onChange={(e) => onFarmChange(e.target.value)}
            >
              <option value="">None (manual location only)</option>
              {visibleFarms.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>
          <p className="small muted" style={{ margin: '-0.5rem 0 0' }}>
            Add farms under
            {' '}
            <Link to="/farms">Farms & map</Link>
            .
          </p>
          <label className="auth-field">
            <span className="auth-label">Produce</span>
            <select
              value={producePick}
              onChange={onProducePickChange}
            >
              {PRODUCE_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          {producePick === 'Other' ? (
            <label className="auth-field">
              <span className="auth-label">Custom name</span>
              <input
                value={customProduce}
                onChange={(e) => setCustomProduce(e.target.value)}
                placeholder="Crop name"
              />
            </label>
          ) : null}
          <label className="auth-field">
            <span className="auth-label">Tonnage</span>
            <input
              type="number"
              step="0.01"
              value={form.tonnage}
              onChange={(e) => setForm((f) => ({ ...f, tonnage: e.target.value }))}
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Type / variety</span>
            <select
              value={form.variety}
              onChange={(e) => setForm((f) => ({ ...f, variety: e.target.value }))}
            >
              <option value="">— Select —</option>
              {varietyOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              Choices match the produce above; use the price note if you need more detail.
            </span>
          </label>
          <label className="auth-field">
            <span className="auth-label">Quality grade</span>
            <select
              value={form.qualityGrade}
              onChange={(e) => setForm((f) => ({ ...f, qualityGrade: e.target.value }))}
            >
              <option value="">— Select —</option>
              {QUALITY_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="auth-field">
            <span className="auth-label">Asking price (UGX per kg)</span>
            <input
              type="number"
              step="1"
              value={form.pricePerKg}
              onChange={(e) => setForm((f) => ({ ...f, pricePerKg: e.target.value }))}
              placeholder="e.g. 3000"
            />
            <span className="text-xs text-slate-500">
              Traders see this on Marketplace; leave empty only if price is fully offline.
            </span>
          </label>
          <label className="auth-field">
            <span className="auth-label">Why this price? (short note)</span>
            <textarea
              rows={3}
              value={form.pricingNote}
              onChange={(e) => setForm((f) => ({ ...f, pricingNote: e.target.value }))}
              placeholder="Quality, season, scarcity, transport — builds trust with buyers."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm"
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Date</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </label>
          <UgandaAddressPickers
            key={editingHarvest?.id || 'new-harvest'}
            label="Harvest location"
            value={form.farmLocation}
            onChange={(farmLocation) => setForm((f) => ({ ...f, farmLocation }))}
          />
          <p className="muted small" style={{ margin: '-0.5rem 0 0' }}>
            Location is required — type district, village, and any landmark that helps find the plot.
          </p>
          <div className="inline-tools wrap">
            <button type="button" className="btn-secondary" onClick={useGps}>
              📍 GPS for this harvest
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={lookupCoordsFromLocationText}
              disabled={geoBusy}
            >
              {geoBusy ? 'Looking up…' : 'Look up coordinates'}
            </button>
          </div>
          <p className="muted small" style={{ margin: '0 0 0.5rem' }}>
            Without GPS, latitude and longitude are filled from the location text when you save (or tap Look up).
          </p>
          <label className="auth-field">
            <span className="auth-label">Latitude</span>
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Longitude</span>
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Proof photo (harvest)</span>
            <input type="file" accept="image/*" onChange={onImage} />
          </label>
          {form.imageDataUrl ? (
            <div>
              <img src={form.imageDataUrl} alt="Preview" className="harvest-thumb" style={{ width: 120, height: 120 }} />
            </div>
          ) : null}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={geoBusy}>
              {geoBusy ? 'Please wait…' : editingHarvest ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
