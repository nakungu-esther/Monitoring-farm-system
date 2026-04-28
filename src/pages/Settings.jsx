import React from 'react';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Settings className="size-6" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">System settings</h2>
            <p className="text-sm text-slate-600">Administration & configuration</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Placeholder for production settings: API keys, notification providers, organization profile,
          and audit options. Wire your NestJS config service and environment flags here.
        </p>
      </div>
    </div>
  );
}
