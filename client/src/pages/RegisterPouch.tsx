import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Radio,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Package,
  Layers,
  MapPin,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { WriteTagModal } from '../components/WriteTagModal';
import { useNavigate } from '../router';

export const RegisterPouch: React.FC = () => {
  const { navigate } = useNavigate();

  const [serialNumber, setSerialNumber] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [pouchType, setPouchType] = useState('Heavy-Duty Kevlar Pouch');
  const [currentDepartmentId, setCurrentDepartmentId] = useState('');
  const [currentCheckpointId, setCurrentCheckpointId] = useState('');
  const [status, setStatus] = useState('Registered');
  const [description, setDescription] = useState('');

  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingSerial, setGeneratingSerial] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success view state
  const [registeredPouch, setRegisteredPouch] = useState<any | null>(null);
  const [showWriteModal, setShowWriteModal] = useState(false);

  // Load departments
  useEffect(() => {
    api.getDepartments().then((res) => {
      if (res.success && res.departments.length > 0) {
        setDepartments(res.departments);
        // Default to first department and checkpoint
        const firstDept = res.departments[0];
        setCurrentDepartmentId(firstDept.id);
        if (firstDept.checkpoints && firstDept.checkpoints.length > 0) {
          setCurrentCheckpointId(firstDept.checkpoints[0].id);
        }
      }
    });

    // Auto-generate initial serial number
    handleGenerateSerial();
  }, []);

  // Update checkpoints when department changes
  const handleDepartmentChange = (deptId: string) => {
    setCurrentDepartmentId(deptId);
    const dept = departments.find((d) => d.id === deptId);
    if (dept && dept.checkpoints && dept.checkpoints.length > 0) {
      setCurrentCheckpointId(dept.checkpoints[0].id);
    } else {
      setCurrentCheckpointId('');
    }
  };

  const handleGenerateSerial = async () => {
    setGeneratingSerial(true);
    try {
      const res = await api.generatePouchSerial();
      if (res.success) {
        setSerialNumber(res.serialNumber);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingSerial(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNumber.trim()) {
      setError('Please provide a batch number.');
      return;
    }
    if (!currentCheckpointId) {
      setError('Please select an initial checkpoint.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createPouch({
        serialNumber: serialNumber.trim() || undefined,
        batchNumber: batchNumber.trim(),
        pouchType,
        currentDepartmentId,
        currentCheckpointId,
        status,
        description: description.trim() || undefined,
      });

      if (res.success) {
        setRegisteredPouch(res.pouch);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register pouch.');
    } finally {
      setLoading(false);
    }
  };

  const selectedDepartment = departments.find((d) => d.id === currentDepartmentId);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <PlusCircle className="w-6 h-6 text-blue-600" />
          <span>Register New Factory Pouch</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Assign unique identifier, batch origin, and initial factory staging location
        </p>
      </div>

      {registeredPouch ? (
        /* Post-Registration Success Screen */
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-md p-6 sm:p-8 space-y-6 animate-slide-up text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Registration Complete
            </span>
            <h2 className="text-2xl font-black font-mono text-slate-900 mt-1">
              {registeredPouch.serialNumber}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Batch: {registeredPouch.batchNumber} &bull; {registeredPouch.pouchType}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Staging Location:</span>
              <span className="font-semibold text-slate-800">
                {registeredPouch.currentDepartment?.name} &rarr; {registeredPouch.currentCheckpoint?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Initial Status:</span>
              <span className="font-semibold text-slate-800">{registeredPouch.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">NFC Hardware Tag:</span>
              <span className="font-bold text-amber-700">Not Programmed Yet</span>
            </div>
          </div>

          {/* Action Options */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setShowWriteModal(true)}
              className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 text-sm"
            >
              <Radio className="w-5 h-5 animate-pulse" />
              <span>Write NFC Tag Now</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/scan')}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition-colors"
              >
                Go to NFC Scanner
              </button>

              <button
                onClick={() => {
                  setRegisteredPouch(null);
                  setBatchNumber('');
                  setDescription('');
                  handleGenerateSerial();
                }}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Register Another Pouch
              </button>
            </div>
          </div>

          {showWriteModal && (
            <WriteTagModal
              isOpen={showWriteModal}
              onClose={() => setShowWriteModal(false)}
              pouch={registeredPouch}
              onNavigateToScan={() => navigate('/scan')}
            />
          )}
        </div>
      ) : (
        /* Registration Form */
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          {/* Serial Number & Auto Generator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Pouch Serial Number *
              </label>
              <button
                type="button"
                onClick={handleGenerateSerial}
                disabled={generatingSerial}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Auto-Generate Number</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                placeholder="e.g. PCH-000123"
                className="w-full px-3.5 py-2.5 font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Standard payload format written to NFC tag: <code className="font-mono text-blue-600">POUCH:{serialNumber || 'PCH-000123'}</code>
            </p>
          </div>

          {/* Batch Number & Pouch Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Batch / Production Lot *
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. BATCH-2026-OCT-A"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Pouch Category / Type
              </label>
              <select
                value={pouchType}
                onChange={(e) => setPouchType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="Heavy-Duty Kevlar Pouch">Heavy-Duty Kevlar Pouch</option>
                <option value="ESD Anti-Static Component Pouch">ESD Anti-Static Component Pouch</option>
                <option value="Thermal Insulated Sample Pouch">Thermal Insulated Sample Pouch</option>
                <option value="High-Barrier Cleanroom Pouch">High-Barrier Cleanroom Pouch</option>
                <option value="Precision Aerospace Tool Pouch">Precision Aerospace Tool Pouch</option>
                <option value="Standard Industrial Pouch">Standard Industrial Pouch</option>
              </select>
            </div>
          </div>

          {/* Initial Department & Checkpoint */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Initial Department *
              </label>
              <select
                value={currentDepartmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                Initial Checkpoint *
              </label>
              <select
                value={currentCheckpointId}
                onChange={(e) => setCurrentCheckpointId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              >
                {selectedDepartment?.checkpoints?.map((cp: any) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Initial Status */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Initial Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="Registered">Registered</option>
              <option value="Awaiting Processing">Awaiting Processing</option>
              <option value="In Production">In Production</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Description / Specs <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Double reinforced stitching, customer contract order #408"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Pouch...</span>
                </>
              ) : (
                <>
                  <span>Register Pouch & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
