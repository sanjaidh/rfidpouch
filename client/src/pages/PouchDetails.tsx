import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Radio,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Edit2,
  Tag,
  History,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Box,
} from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { WriteTagModal } from '../components/WriteTagModal';
import { RecordMovementModal } from '../components/RecordMovementModal';
import { useNavigate } from '../router';

export const PouchDetails: React.FC = () => {
  const { params, navigate } = useNavigate();
  const pouchId = params.id;

  const [pouch, setPouch] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBatch, setEditBatch] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const loadPouch = useCallback(async () => {
    if (!pouchId) return;
    setLoading(true);
    try {
      const res = await api.getPouch(pouchId);
      if (res.success) {
        setPouch(res.pouch);
        setEditBatch(res.pouch.batchNumber);
        setEditDesc(res.pouch.description || '');
      }
    } catch (err: any) {
      setError(err.message || 'Pouch not found');
    } finally {
      setLoading(false);
    }
  }, [pouchId]);

  useEffect(() => {
    loadPouch();
  }, [loadPouch]);

  const handleSaveEdit = async () => {
    try {
      await api.updatePouch(pouch.id, {
        batchNumber: editBatch,
        description: editDesc,
      });
      setIsEditing(false);
      loadPouch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !pouch) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Pouch Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'This pouch does not exist in the factory database.'}</p>
        <button
          onClick={() => navigate('/pouches')}
          className="py-2 px-4 bg-slate-800 text-white rounded-xl text-xs font-semibold"
        >
          Back to Registry
        </button>
      </div>
    );
  }

  const expectedNfcPayload = `POUCH:${pouch.serialNumber}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate('/pouches')}
          className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Registry</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowWriteModal(true)}
            className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors flex items-center space-x-1.5"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Write NFC Tag</span>
          </button>

          <button
            onClick={() => navigate('/twin', { locate: pouch.serialNumber })}
            className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors flex items-center space-x-1.5"
            title="Locate pouch in 3D Digital Twin"
          >
            <Box className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>Locate in 3D Twin</span>
          </button>

          <button
            onClick={() => setShowMovementModal(true)}
            className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center space-x-1.5"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Record Movement</span>
          </button>

          <button
            onClick={() => navigate('/scan')}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5"
          >
            <Radio className="w-3.5 h-3.5 text-slate-500" />
            <span>Scan Tag</span>
          </button>
        </div>
      </div>

      {/* Main Identity Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900 tracking-tight">
                {pouch.serialNumber}
              </span>
              <StatusBadge status={pouch.status} />
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              {pouch.pouchType} &bull; Batch: <span className="font-semibold text-slate-700">{pouch.batchNumber}</span>
            </p>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="self-start py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Specs'}</span>
          </button>
        </div>

        {/* Edit Form Drawer */}
        {isEditing && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Edit Pouch Data</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Batch Number</label>
                <input
                  type="text"
                  value={editBatch}
                  onChange={(e) => setEditBatch(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
            <button
              onClick={handleSaveEdit}
              className="py-1.5 px-3 bg-blue-600 text-white rounded-lg text-xs font-bold"
            >
              Save Changes
            </button>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Location */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Current Checkpoint
            </span>
            <div className="text-xs font-bold text-slate-900 mt-1">
              {pouch.currentDepartment?.name}
            </div>
            <div className="text-[11px] text-slate-500">
              &rarr; {pouch.currentCheckpoint?.name}
            </div>
          </div>

          {/* NFC Tag Programming Status */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Physical NFC Tag
            </span>
            <div className="mt-1">
              {pouch.tagProgrammed ? (
                <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Programmed</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full text-[11px] font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Not Programmed</span>
                </span>
              )}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
              Payload: {expectedNfcPayload}
            </div>
          </div>

          {/* Registration Time */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Registered Date
            </span>
            <div className="text-xs font-semibold text-slate-800 mt-1">
              {new Date(pouch.registeredAt).toLocaleDateString()}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {new Date(pouch.registeredAt).toLocaleTimeString()}
            </div>
          </div>

          {/* Last Physical Scan */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Last Checkpoint Scan
            </span>
            <div className="text-xs font-semibold text-slate-800 mt-1">
              {pouch.lastScannedAt ? new Date(pouch.lastScannedAt).toLocaleDateString() : 'Never'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {pouch.lastScannedAt ? new Date(pouch.lastScannedAt).toLocaleTimeString() : 'Awaiting 1st scan'}
            </div>
          </div>
        </div>

        {pouch.description && (
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-700">Specification Notes: </span>
            <span>{pouch.description}</span>
          </div>
        )}
      </div>

      {/* Complete Movement Timeline Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">Chronological Movement Timeline</h3>
          </div>
          <span className="text-xs text-slate-400">
            {pouch.movements?.length || 0} movement events
          </span>
        </div>

        {(!pouch.movements || pouch.movements.length === 0) ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No movements recorded yet. Use Scan NFC or Record Movement above.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {pouch.movements.map((m: any, index: number) => {
              const isFirst = index === 0;

              return (
                <div key={m.id} className="relative group">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 ${
                      isFirst
                        ? 'bg-blue-600 border-white ring-4 ring-blue-100'
                        : 'bg-slate-300 border-white'
                    }`}
                  />

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:bg-slate-100/70 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">
                          {m.newDepartment?.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          &rarr; {m.newCheckpoint?.name}
                        </span>
                      </div>
                      <StatusBadge status={m.newStatus} size="sm" />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <div>
                        Operator: <span className="font-semibold text-slate-700">{m.operatorName || 'Operator'}</span>
                      </div>
                      <div>
                        Source: <span className="font-semibold text-slate-700">{m.source === 'phone_nfc' ? 'Phone NFC' : m.source}</span>
                      </div>
                      <div>
                        Result: <span className={`font-semibold ${m.result === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{m.result}</span>
                      </div>
                      <div className="font-mono text-slate-400">
                        {new Date(m.occurredAt).toLocaleString()}
                      </div>
                    </div>

                    {m.notes && (
                      <div className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                        Note: {m.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showWriteModal && (
        <WriteTagModal
          isOpen={showWriteModal}
          onClose={() => setShowWriteModal(false)}
          pouch={pouch}
          onSuccess={loadPouch}
          onNavigateToScan={() => navigate('/scan')}
        />
      )}

      {showMovementModal && (
        <RecordMovementModal
          isOpen={showMovementModal}
          onClose={() => setShowMovementModal(false)}
          pouch={pouch}
          onSuccess={loadPouch}
        />
      )}
    </div>
  );
};
