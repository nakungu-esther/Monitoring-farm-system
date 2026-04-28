import React from 'react';

/**
 * Free-text location / address (no picklists).
 */
export default function UgandaAddressPickers({
  value,
  onChange,
  label = 'Location / address',
  placeholder = 'e.g. village, parish, district, landmark…',
}) {
  return (
    <label className="auth-field">
      <span className="auth-label">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
      />
    </label>
  );
}
