import React from 'react';

export default function EmptyState({ icon = '📋', title, hint }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden>{icon}</span>
      <p className="empty-title">{title}</p>
      {hint ? <p className="empty-hint">{hint}</p> : null}
    </div>
  );
}
