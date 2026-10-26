import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  MapPin,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Package,
  X,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from '../router';

export const Checkpoints: React.FC = () => {
  const { navigate } = useNavigate();
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal for new checkpoint
  const [showAddCheckpoint, setShowAddCheckpoint] = useState(false);
  const [targetDeptId, setTargetDeptId] = useState('');
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [newCheckpointDesc, setNewCheckpointDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDepartments(true);
      if (res.success) {
        setDepartments(res.departments);
        if (res.departments.length > 0 && !targetDeptId) {
          setTargetDeptId(res.departments[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [targetDeptId]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const handleToggleCheckpointActive = async (cp: any) => {
    try {
      await api.updateCheckpoint(cp.id, { active: !cp.active });
      loadDepartments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckpointName.trim() || !targetDeptId) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.createCheckpoint({
        name: newCheckpointName.trim(),
        departmentId: targetDeptId,
        description: newCheckpointDesc.trim() || undefined,
      });
      setShowAddCheckpoint(false);
      setNewCheckpointName('');
      setNewCheckpointDesc('');
      loadDepartments();
    } catch (err: any) {
      setError(err.message || 'Failed to create checkpoint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            <span>Factory Departments & Checkpoints</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure physical processing stations across 8 shopfloor departments
          </p>
        </div>

        <button
          onClick={() => setShowAddCheckpoint(true)}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Checkpoint</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading department hierarchy...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-900 text-base">{dept.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Dept
                    </span>
                  </div>
                  {dept.description && (
                    <p className="text-xs text-slate-500 mt-1">{dept.description}</p>
                  )}
                </div>

                <div
                  onClick={() => navigate('/pouches', { departmentId: dept.id })}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer transition-colors"
                  title="View active pouches in this department"
                >
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  <span>{dept._count?.currentPouches || 0} Pouches</span>
                </div>
              </div>

              {/* Checkpoints in this Department */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Registered Checkpoints ({dept.checkpoints?.length || 0})
                </span>

                {(!dept.checkpoints || dept.checkpoints.length === 0) ? (
                  <p className="text-xs text-slate-400 italic py-2">No checkpoints defined in this department.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {dept.checkpoints.map((cp: any) => (
                      <div
                        key={cp.id}
                        className="py-2.5 flex items-center justify-between text-xs group"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            <span className="font-semibold text-slate-800">{cp.name}</span>
                            {!cp.active && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                                Inactive
                              </span>
                            )}
                          </div>
                          {cp.description && (
                            <p className="text-[11px] text-slate-400 pl-5">{cp.description}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleToggleCheckpointActive(cp)}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded border transition-colors ${
                            cp.active
                              ? 'text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                              : 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {cp.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Checkpoint Modal */}
      {showAddCheckpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">Add Factory Checkpoint</h3>
              <button
                onClick={() => setShowAddCheckpoint(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCheckpoint} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Department *
                </label>
                <select
                  value={targetDeptId}
                  onChange={(e) => setTargetDeptId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium"
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Checkpoint Name *
                </label>
                <input
                  type="text"
                  value={newCheckpointName}
                  onChange={(e) => setNewCheckpointName(e.target.value)}
                  placeholder="e.g. Die Cut Table 2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  value={newCheckpointDesc}
                  onChange={(e) => setNewCheckpointDesc(e.target.value)}
                  rows={2}
                  placeholder="e.g. Secondary cutting station for heat-sealed borders"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCheckpoint(false)}
                  className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow"
                >
                  {submitting ? 'Saving...' : 'Create Checkpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
