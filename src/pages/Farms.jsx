import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FarmMap from '../components/FarmMap';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import UgandaAddressPickers from '../components/UgandaAddressPickers';
import { buildFarmGeocodeQuery, geocodePlaceName } from '../utils/geocodeAddress';
import { minTrimmedLength } from '../utils/authValidation';

export default function Farms() {
  const { visibleFarms, visibleHarvests, addFarm, currentUser } = useAgriTrack();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
  });
  const [geoBusy, setGeoBusy] = useState(false);

  const applyGeocodeResult = (g) => {
    if (!g.ok) return null;
    return {
      latitude: String(Number(g.latitude).toFixed(6)),
      longitude: String(Number(g.longitude).toFixed(6)),
    };
  };

  const lookupCoordsFromAddress = async () => {
    const q = buildFarmGeocodeQuery(form);
    if (!q) {
      toast('Enter an address or farm name first', 'warn');
      return;
    }
    setGeoBusy(true);
    try {
      const g = await geocodePlaceName(q);
      const coords = applyGeocodeResult(g);
      if (coords) {
        setForm((f) => ({ ...f, ...coords }));
        toast(g.label ? `Found: ${g.label}` : 'Coordinates updated');
      } else {
        toast(g.error, 'warn');
      }
    } finally {
      setGeoBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!minTrimmedLength(form.name, 1)) {
      toast('Enter a farm name.', 'warn');
      return;
    }
    if (!minTrimmedLength(form.address, 1)) {
      toast('Enter an address (district, village, or landmark).', 'warn');
      return;
    }
    let { name, address, latitude, longitude } = form;
    const addrQ = buildFarmGeocodeQuery({ address, name });
    const missingCoords = latitude === '' || longitude === '';
    if (missingCoords && addrQ) {
      setGeoBusy(true);
      try {
        const g = await geocodePlaceName(addrQ);
        const coords = applyGeocodeResult(g);
        if (coords) {
          latitude = coords.latitude;
          longitude = coords.longitude;
          if (g.label) toast(`Coordinates from address: ${g.label}`, 'info');
        } else {
          toast(g.error, 'warn');
        }
      } finally {
        setGeoBusy(false);
      }
    }
    const r = await addFarm({ name, address, latitude, longitude });
    if (r?.ok === false) {
      toast(r.error || 'Could not save farm', 'error');
      return;
    }
    toast('Farm saved — link harvests from Produce.');
    setOpen(false);
    setForm({ name: '', address: '', latitude: '', longitude: '' });
  };

  const useGps = () => {
    if (!navigator.geolocation) {
      toast('GPS not available in this browser', 'warn');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: String(pos.coords.latitude.toFixed(6)),
          longitude: String(pos.coords.longitude.toFixed(6)),
        }));
        toast('Location captured');
      },
      () => toast('Could not read location — enter coordinates manually', 'warn'),
    );
  };

  return (
    <div className="page farms-page">
      <div className="page-actions">
        <p className="page-lead muted" style={{ margin: 0, flex: 1 }}>
          Add farm locations and GPS so harvests and maps use the right plot.
        </p>
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          + Add farm
        </button>
      </div>

      {visibleFarms.length === 0 ? (
        <div className="card-like pad-lg">
          <EmptyState
            icon="📍"
            title="No farms yet"
            hint="Add your first location, then tag produce entries to that farm."
          />
        </div>
      ) : (
        <section className="panel" style={{ marginBottom: '1rem' }}>
          <h2 className="panel-heading">Map</h2>
          <FarmMap farms={visibleFarms} harvests={visibleHarvests} />
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-heading">Your farms</h2>
          <Link to="/farm" className="link-arrow">Log produce</Link>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>GPS</th>
              </tr>
            </thead>
            <tbody>
              {visibleFarms.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted center">No rows yet.</td>
                </tr>
              ) : (
                visibleFarms.map((f) => (
                  <tr key={f.id}>
                    <td className="fw-semibold">{f.name}</td>
                    <td className="muted small">{f.address || '—'}</td>
                    <td className="small tabular">
                      {f.latitude != null && f.longitude != null
                        ? `${f.latitude}, ${f.longitude}`
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal title="Add farm" isOpen={open} onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="modal-form" noValidate>
          <label className="auth-field">
            <span className="auth-label">Farm name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Block A"
            />
          </label>
          <UgandaAddressPickers
            label="Address"
            value={form.address}
            onChange={(address) => setForm((f) => ({ ...f, address }))}
          />
          <div className="inline-tools wrap" style={{ marginBottom: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={useGps}>
              📍 Use my location
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={lookupCoordsFromAddress}
              disabled={geoBusy}
            >
              {geoBusy ? 'Looking up…' : 'Look up coordinates'}
            </button>
          </div>
          <p className="muted small" style={{ margin: '0 0 0.75rem' }}>
            If you skip GPS, coordinates are filled from your address when you save (or use Look up).
          </p>
          <label className="auth-field">
            <span className="auth-label">Latitude (optional)</span>
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Longitude (optional)</span>
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={geoBusy}>
              {geoBusy ? 'Please wait…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
