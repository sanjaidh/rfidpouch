import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Filter,
  Radio,
  Clock,
  Check,
  X,
  FileText,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from '../router';

export const Alerts: React.FC = () => {
  const { navigate } = useNavigate();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('open');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Resolution modal
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts({
        status: statusFilter !== 'all' ? statusFilter : '',
        severity: severityFilter !== 'all' ? severityFilter : '',
        type: typeFilter !== 'all' ? typeFilter : '',
      });
      if (res.success) {
        setAlerts(res.alerts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, typeFilter]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleResolveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;

    setResolving(true);
    try {
      await api.resolveAlert(selectedAlert.id, {
        resolutionStatus,
        resolutionNotes: resolutionNotes.trim() || undefined,
      });
      setSelectedAlert(null);
      setResolutionNotes('');
      loadAlerts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setResolving(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Low</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <AlertCircle className="w-6 h-6 text-rose-600" />
            <span>Factory Alerts & Exceptions</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit log of scan anomalies, unexpected transitions, and overdue pouch warnings
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center space-x-2">
          {['open', 'in_review', 'resolved', 'all'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          {/* Severity */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
          >
            <option value="all">All Types</option>
            <option value="unexpected_transition">Unexpected Transition</option>
            <option value="unregistered_tag">Unregistered Tag</option>
            <option value="overdue_pouch">Overdue Pouch</option>
            <option value="duplicate_movement">Duplicate Movement</option>
            <option value="inactive_pouch">Inactive Pouch</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Querying alert records...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
            <h3 className="font-bold text-slate-800 text-sm">No alerts matching filter</h3>
            <p className="text-xs text-slate-400">All factory checkpoint workflows are operating smoothly.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  {getSeverityBadge(alert.severity)}
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    {alert.type.replace(/_/g, ' ')}
                  </span>
                  {alert.pouch && (
                    <span
                      onClick={() => navigate(`/pouches/${alert.pouch.id}`)}
                      className="font-mono font-bold text-xs text-blue-600 hover:underline cursor-pointer"
                    >
                      [{alert.pouch.serialNumber}]
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(alert.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                {alert.description}
              </p>

              {alert.resolutionNotes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                  <span className="font-bold text-slate-700 block">Resolution Notes:</span>
                  <p>{alert.resolutionNotes}</p>
                  {alert.resolvedAt && (
                    <span className="text-[10px] text-slate-400 font-mono block pt-0.5">
                      Resolved: {new Date(alert.resolvedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              {/* Status and Action */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500">
                  Status:{' '}
                  <span className="font-semibold capitalize text-slate-700">
                    {alert.resolutionStatus.replace('_', ' ')}
                  </span>
                </span>

                {alert.resolutionStatus === 'open' || alert.resolutionStatus === 'in_review' ? (
                  <button
                    onClick={() => {
                      setSelectedAlert(alert);
                      setResolutionStatus('resolved');
                      setResolutionNotes('');
                    }}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Review / Resolve
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Closed</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review & Resolve Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">Resolve Exception Alert</h3>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveAlert} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
                <span className="font-bold block text-slate-900 mb-1">Alert Description:</span>
                <p>{selectedAlert.description}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Action Status
                </label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium"
                >
                  <option value="resolved">Mark Resolved</option>
                  <option value="in_review">Mark Under Investigation</option>
                  <option value="dismissed">Dismiss (False Positive / Transient)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Resolution / Investigation Notes
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Verified tag with physical QA stamp; authorized progression."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow"
                >
                  {resolving ? 'Submitting...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
