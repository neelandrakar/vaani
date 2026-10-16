import React, { useState } from 'react';
import { CalendarClock, Check, X, User, Phone, MapPin, Clock, Filter } from 'lucide-react';
import { Callback, api } from '../services/api';

interface CallbacksViewProps {
  callbacks: Callback[];
  onRefresh: () => void;
}

export const CallbacksView: React.FC<CallbacksViewProps> = ({ callbacks, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredCallbacks = callbacks.filter((cb) => {
    return statusFilter === 'ALL' || cb.status === statusFilter;
  });

  const handleUpdateStatus = async (callbackId: string, status: 'COMPLETED' | 'CANCELLED') => {
    setIsUpdating(true);
    try {
      await api.updateCallbackStatus(callbackId, status);
      onRefresh();
    } catch (err: any) {
      alert(`Error updating callback: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Scheduled Callbacks</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Confirmed appointment slots and site visits requested by qualified prospects.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 shadow-xs"
          >
            <option value="ALL">All Callbacks</option>
            <option value="PENDING">Pending Only</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Callbacks Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Scheduled Slot (Timezone)</th>
                <th className="py-3 px-4">Lead Contact</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Assigned Operator</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCallbacks.map((cb) => (
                <tr key={cb.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2 font-medium text-slate-900">
                      <CalendarClock className="w-4 h-4 text-teal-600" />
                      <span>
                        {new Date(cb.requestedTime).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{cb.timezone}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{cb.lead.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{cb.lead.phone}</div>
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    <div className="font-medium text-slate-800">{cb.reason || 'Follow-up consultation'}</div>
                    {cb.notes && <div className="text-[11px] text-slate-400 mt-0.5">{cb.notes}</div>}
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    {cb.assignedUser ? (
                      <span className="font-medium text-slate-800">{cb.assignedUser.name}</span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned (Pool)</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        cb.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : cb.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {cb.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right space-x-1">
                    {cb.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(cb.id, 'COMPLETED')}
                          disabled={isUpdating}
                          className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                          title="Mark Completed"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(cb.id, 'CANCELLED')}
                          disabled={isUpdating}
                          className="p-1 rounded bg-red-50 text-red-700 hover:bg-red-100 transition"
                          title="Cancel Callback"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCallbacks.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No callbacks found matching selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
