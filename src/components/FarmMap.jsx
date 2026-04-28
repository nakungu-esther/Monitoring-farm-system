import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

/** Bundled URLs (avoid unpkg CDN: Tracking Prevention breaks cross-site asset storage in Edge/Safari). */
const icon = new L.Icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * @param {{ farms: Array<{ id: string, name: string, latitude?: number | null, longitude?: number | null, address?: string }>, harvests?: Array<{ id: string, produceName: string, latitude?: number | null, longitude?: number | null, farmLocation: string }> }} props
 */
export default function FarmMap({ farms, harvests = [] }) {
  const points = useMemo(() => {
    const list = [];
    (farms || []).forEach((f) => {
      if (f.latitude != null && f.longitude != null) {
        list.push({
          key: `farm-${f.id}`,
          lat: f.latitude,
          lng: f.longitude,
          title: f.name,
          sub: f.address || 'Registered farm',
        });
      }
    });
    (harvests || []).forEach((h) => {
      if (h.latitude != null && h.longitude != null) {
        list.push({
          key: `h-${h.id}`,
          lat: h.latitude,
          lng: h.longitude,
          title: h.produceName,
          sub: h.farmLocation || 'Harvest GPS',
        });
      }
    });
    return list;
  }, [farms, harvests]);

  const center = useMemo(() => {
    if (!points.length) return [0.3476, 32.5825];
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    return [lat, lng];
  }, [points]);

  return (
    <div className="farm-map-wrap">
      <MapContainer
        center={center}
        zoom={points.length ? 11 : 6}
        className="farm-map-leaflet"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p) => (
          <Marker key={p.key} position={[p.lat, p.lng]} icon={icon}>
            <Popup>
              <strong>{p.title}</strong>
              <br />
              {p.sub}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
