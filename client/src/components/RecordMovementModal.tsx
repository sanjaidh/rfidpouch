import React, { useState, useEffect } from 'react';
import { ArrowRight, MapPin, User, FileText, CheckCircle2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';

interface RecordMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  pouch: {
    id: string;
    serialNumber: string;
    batchNumber: string;
    status: string;
    currentDepartment?: { name: string };
    currentCheckpoint?: { id: string; name: string };
  };
  initialCheckpointId?: string;
  onSuccess?: () => void;
}

export const RecordMovementModal: React.FC<RecordMovementModalProps> = ({
  isOpen,
  onClose,
  pouch,
  initialCheckpointId,
  onSuccess,
}) => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState(initialCheckpointId || '');
  const [operatorName, setOperatorName] = useState(() => {
    return localStorage.getItem('pouchtrack_operator_name') || 'Rajesh Kumar (Tech-104)';
  });
  const [notes, setNotes] = useState('');
  const [bypassRules, setBypassRules] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getDepartments().then((res) => {
        if (res.success) {
          setDepartments(res.departments);
          if (!selectedCheckpointId && res.departments.length > 0) {
            const firstWithCp = res.departments.find((d: any) => d.checkpoints.length > 0);
            if (firstWithCp) {
              setSelectedCheckpointId(firstWithCp.checkpoints[0].id);
            }
          }
        }
      });
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialCheckpointId) {
      setSelectedCheckpointId(initialCheckpointId);
    }
  }, [initialCheckpointId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckpointId) {
      setError('Please select a destination checkpoint.');
      return;
    }

    // Save operator name for smooth workflow
    localStorage.setItem('pouchtrack_operator_name', operatorName);

    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = `mov-${pouch.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await api.recordMovement({
        pouchId: pouch.id,
        destinationCheckpointId: selectedCheckpointId,
        operatorName: operatorName.trim() || 'Factory Operator',
        source: 'manual_entry',
        notes: notes.trim() || undefined,
        idempotencyKey,
        bypassWorkflowRules: bypassRules,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to record movement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-800">Record Pouch Movement</h3>
            <p className="text-xs text-slate-500">Append-only factory checkpoint progression</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-800">Movement Confirmed!</h4>
              <p className="text-sm text-slate-600">Pouch location and status updated in factory registry.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pouch Current Info Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900 text-base">{pouch.serialNumber}</span>
                    <span className="text-xs text-slate-500">({pouch.batchNumber})</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Current: {pouch.currentDepartment?.name || 'Inward'} &rarr; {pouch.currentCheckpoint?.name || 'Dock'}</span>
                  </div>
                </div>
                <StatusBadge status={pouch.status} />
              </div>

              {/* Destination Checkpoint Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Destination Checkpoint *
                </label>
                <select
                  value={selectedCheckpointId}
                  onChange={(e) => setSelectedCheckpointId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  required
                >
                  <option value="" disabled>Select destination checkpoint</option>
                  {departments.map((dept) => (
                    <optgroup key={dept.id} label={`Department: ${dept.name}`}>
                      {dept.checkpoints.map((cp: any) => (
                        <option key={cp.id} value={cp.id}>
                          {cp.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Operator Identifier (Operational Identifier, NOT Authentication) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Operator Identifier <span className="text-slate-400 font-normal lowercase">(for audit log, no login required)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar (Tech-104)"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Inspection / Transition Notes <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Passed seam integrity check, staged for sealing"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Administrative Rule Bypass */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="bypassRules"
                  checked={bypassRules}
                  onChange={(e) => setBypassRules(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="bypassRules" className="text-xs text-slate-600 cursor-pointer">
                  Administrative override (bypass stage progression rules)
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Movement</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
