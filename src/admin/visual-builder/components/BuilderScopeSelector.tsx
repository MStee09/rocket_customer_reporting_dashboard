import React from 'react';
import { Shield, Users } from 'lucide-react';

interface BuilderScopeSelectorProps {
  targetScope: 'admin' | 'customer';
  setTargetScope: (s: 'admin' | 'customer') => void;
  targetCustomerId: number | null;
  setTargetCustomerId: (id: number | null) => void;
  customers: Array<{ customer_id: number; customer_name: string }> | null;
}

export function BuilderScopeSelector({
  targetScope,
  setTargetScope,
  targetCustomerId,
  setTargetCustomerId,
  customers,
}: BuilderScopeSelectorProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Data Scope</h2>
      <div className="flex gap-3">
        <button
          onClick={() => setTargetScope('admin')}
          className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
            targetScope === 'admin' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
          }`}
        >
          <Shield className={`w-4 h-4 ${targetScope === 'admin' ? 'text-blue-600' : 'text-slate-400'}`} />
          <span className={`text-sm font-medium ${targetScope === 'admin' ? 'text-blue-900' : 'text-slate-700'}`}>
            All Customers
          </span>
        </button>
        <button
          onClick={() => setTargetScope('customer')}
          className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
            targetScope === 'customer' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
          }`}
        >
          <Users className={`w-4 h-4 ${targetScope === 'customer' ? 'text-blue-600' : 'text-slate-400'}`} />
          <span className={`text-sm font-medium ${targetScope === 'customer' ? 'text-blue-900' : 'text-slate-700'}`}>
            Specific Customer
          </span>
        </button>
      </div>
      {targetScope === 'customer' && customers && (
        <select
          value={targetCustomerId || ''}
          onChange={(e) => setTargetCustomerId(Number(e.target.value) || null)}
          className="w-full mt-3 px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">Select customer...</option>
          {customers.map((c) => (
            <option key={c.customer_id} value={c.customer_id}>{c.customer_name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
