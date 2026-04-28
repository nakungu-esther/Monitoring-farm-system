/** Strip legacy “Demo ” prefix so dashboards greet “Farmer” not “Demo”. */
export function profileNameWithoutDemoPrefix(raw) {
  if (raw == null || raw === '') return '';
  return String(raw).replace(/^\s*demo\s+/i, '').trim();
}
