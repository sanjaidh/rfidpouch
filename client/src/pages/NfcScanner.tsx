import React, { useState, useEffect } from 'react';
import {
  Radio,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  RotateCcw,
  Square,
  ShieldAlert,
  Cpu,
  Layers,
  Sparkles,
  Info,
  Clock,
  Loader2,
} from 'lucide-react';
import { useWebNfc } from '../hooks/useWebNfc';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useNavigate } from '../router';

export const NfcScanner: React.FC = () => {
  const { navigate } = useNavigate();
  const {
    isSupported,
    isSecureContext,
    isScanning,
    status,
    lastScan,
    errorMessage,
    startScan,
    stopScan,
    clearError,
    simulatorMode,
    setSimulatorMode,
    simulateScan,
  } = useWebNfc();

  // Departments and Checkpoints
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string>('');
  const [operatorName, setOperatorName] = useState(() => {
    return localStorage.getItem('pouchtrack_operator_name') || 'Rajesh Kumar (Tech-104)';
  });

  // Pouch lookup state
  const [matchedPouch, setMatchedPouch] = useState<any | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Movement submission state
  const [isRecording, setIsRecording] = useState(false);
  const [movementSuccess, setMovementSuccess] = useState<any | null>(null);
  const [movementError, setMovementError] = useState<string | null>(null);

  // Recent scans local log
  const [recentScans, setRecentScans] = useState<any[]>([]);

  // Simulation test input
  const [simulatedSerialInput, setSimulatedSerialInput] = useState('PCH-000101');

  // Load active checkpoints
  useEffect(() => {
    api.getDepartments().then((res) => {
      if (res.success && res.departments.length > 0) {
        setDepartments(res.departments);
        // Find first active checkpoint
        const deptWithCp = res.departments.find((d: any) => d.checkpoints?.length > 0);
        if (deptWithCp && deptWithCp.checkpoints?.length > 0) {
          setSelectedCheckpointId(deptWithCp.checkpoints[0].id);
        }
      }
    });
  }, []);

  // When a tag is read, lookup the pouch in database
  useEffect(() => {
    if (lastScan && lastScan.serialNumber && lastScan.isValidPouch) {
      setIsLookingUp(true);
      setLookupError(null);
      setMovementSuccess(null);
      setMovementError(null);

      api
        .lookupPouch(lastScan.serialNumber)
        .then((res) => {
          if (res.success) {
            setMatchedPouch(res.pouch);
            // Append to recent scans log
            setRecentScans((prev) => [
              {
                serialNumber: res.pouch.serialNumber,
                batchNumber: res.pouch.batchNumber,
                status: res.pouch.status,
                department: res.pouch.currentDepartment?.name,
                checkpoint: res.pouch.currentCheckpoint?.name,
                timestamp: new Date(),
                tagUid: lastScan.tagUid,
              },
              ...prev.slice(0, 9),
            ]);
          }
        })
        .catch((err) => {
          setMatchedPouch(null);
          setLookupError(err.message || 'Pouch not found in factory registry.');
        })
        .finally(() => {
          setIsLookingUp(false);
        });
    } else if (lastScan && !lastScan.isValidPouch) {
      setMatchedPouch(null);
      setLookupError(lastScan.errorMessage || 'Invalid NFC tag content.');
    }
  }, [lastScan]);

  const handleConfirmMovement = async () => {
    if (!matchedPouch || !selectedCheckpointId) return;

    localStorage.setItem('pouchtrack_operator_name', operatorName);
    setIsRecording(true);
    setMovementError(null);

    try {
      const idempotencyKey = `scan-${matchedPouch.id}-${Date.now()}`;
      const res = await api.recordMovement({
        pouchId: matchedPouch.id,
        pouchSerialNumber: matchedPouch.serialNumber,
        destinationCheckpointId: selectedCheckpointId,
        operatorName: operatorName.trim() || 'Factory Operator',
        source: simulatorMode ? 'simulator' : 'phone_nfc',
        idempotencyKey,
      });

      if (res.success) {
        setMovementSuccess(res.movement);
        // Refresh matched pouch data
        setMatchedPouch(res.pouch);
      }
    } catch (err: any) {
      setMovementError(err.message || 'Failed to record movement.');
    } finally {
      setIsRecording(false);
    }
  };

  const handleResetScan = () => {
    setMatchedPouch(null);
    setMovementSuccess(null);
    setLookupError(null);
    setMovementError(null);
    clearError();
  };

  const selectedCheckpoint = departments
    .flatMap((d) => d.checkpoints || [])
    .find((cp) => cp.id === selectedCheckpointId);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
            <Radio className="w-7 h-7 text-blue-600 animate-pulse" />
            <span>NFC Factory Scanner</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real browser Web NFC hardware reader &bull; Zero login required
          </p>
        </div>

        {/* Hardware Status Indicator */}
        <div className="flex items-center space-x-2">
          {isSupported ? (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Web NFC Hardware Active</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Web NFC Unavailable</span>
            </div>
          )}
        </div>
      </div>

      {/* Target Destination Checkpoint Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>Destination Factory Checkpoint</span>
          </label>
          <span className="text-[11px] text-slate-400">Scanned pouches will transfer here</span>
        </div>

        <select
          value={selectedCheckpointId}
          onChange={(e) => setSelectedCheckpointId(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer"
        >
          {departments.map((dept) => (
            <optgroup key={dept.id} label={`Department: ${dept.name}`}>
              {dept.checkpoints?.map((cp: any) => (
                <option key={cp.id} value={cp.id}>
                  {dept.name} &rarr; {cp.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Operator Identifier Input */}
        <div className="pt-1 flex items-center space-x-2">
          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="Operator Name (e.g. Rajesh Kumar)"
            className="flex-1 px-3 py-1.5 bg-transparent border-b border-slate-200 focus:border-blue-500 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <span className="text-[10px] text-slate-400 hidden sm:inline">Audit Identifier</span>
        </div>
      </div>

      {/* Primary Scanner Action Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Radar Pulse Background Animation when Scanning */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-96 h-96 rounded-full bg-blue-500 animate-ping" />
          </div>
        )}

        {/* Scan Status Visual */}
        <div className="relative z-10 flex flex-col items-center">
          <div
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isScanning
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/50 animate-nfc-pulse'
                : status === 'success'
                ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/40 ring-8 ring-emerald-100'
                : status === 'error'
                ? 'bg-rose-600 text-white shadow-xl shadow-rose-500/40 ring-8 ring-rose-100'
                : 'bg-slate-100 text-slate-500 border-2 border-dashed border-slate-300'
            }`}
          >
            {isScanning ? (
              <Radio className="w-14 h-14 animate-pulse" />
            ) : status === 'success' ? (
              <CheckCircle2 className="w-14 h-14" />
            ) : status === 'error' ? (
              <AlertTriangle className="w-14 h-14" />
            ) : (
              <Radio className="w-14 h-14" />
            )}
          </div>

          {/* Status Text & Instruction */}
          <div className="mt-5 space-y-1 max-w-sm mx-auto">
            <h3 className="text-xl font-bold text-slate-900">
              {isScanning
                ? 'NFC Reader Active'
                : status === 'success'
                ? 'Physical Tag Decoded'
                : status === 'error'
                ? 'Scan Attention Required'
                : 'Ready to Scan NFC Tag'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              {isScanning
                ? 'Hold the back of your Android phone close to the NFC tag.'
                : status === 'success'
                ? 'Review decoded pouch details and confirm movement below.'
                : 'Tap Start NFC Scan to activate phone antenna.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-xs justify-center">
            {isScanning ? (
              <button
                onClick={stopScan}
                className="w-full min-h-[48px] py-3 px-6 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center space-x-2"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Scanning</span>
              </button>
            ) : (
              <button
                onClick={startScan}
                className="w-full min-h-[48px] py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center space-x-2.5 text-base"
              >
                <Radio className="w-5 h-5 animate-pulse" />
                <span>Start NFC Scan</span>
              </button>
            )}

            {(status === 'success' || status === 'error') && !isScanning && (
              <button
                onClick={handleResetScan}
                className="min-h-[48px] py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Hardware Incompatibility Alert Notice */}
        {!isSupported && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 space-y-3">
            <div className="flex items-center space-x-2 font-bold text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                {!isSecureContext
                  ? 'Insecure HTTP Origin: Web NFC Blocked by Chrome'
                  : 'Web NFC Not Supported in This Browser / Device'}
              </span>
            </div>

            {!isSecureContext ? (
              <div className="space-y-2">
                <p className="leading-relaxed">
                  Your Android phone and Chrome support NFC, but <strong>Web NFC is strictly locked by Chromium to Secure Contexts (HTTPS or localhost)</strong>. Because you connected via plain Wi-Fi HTTP (<code>{typeof window !== 'undefined' ? window.location.origin : 'http://...'}</code>), Chrome hides the NFC hardware API.
                </p>
                <div className="p-3 bg-amber-100/70 border border-amber-200/80 rounded-lg text-amber-950 font-medium space-y-1.5 mt-2">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-amber-900">
                    Quick 30-Second Fix in Android Chrome:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-900">
                    <li>In Android Chrome, go to: <code className="bg-amber-200/60 px-1 py-0.5 rounded font-mono text-[10px]">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
                    <li>Set the flag to <strong>Enabled</strong>.</li>
                    <li>Enter this origin in the input box: <code className="bg-amber-200/60 px-1 py-0.5 rounded font-mono text-[10px]">{typeof window !== 'undefined' ? window.location.origin : 'http://<your-pc-ip>:5173'}</code></li>
                    <li>Tap <strong>Relaunch</strong> Chrome.</li>
                  </ol>
                  <p className="text-[10px] text-amber-800 pt-1">
                    Or run Vite with HTTPS on your PC: <code className="font-mono bg-amber-200/60 px-1 py-0.5 rounded">npm run dev:https</code>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p>
                  Web NFC is not supported in this browser or device. Open this application in a compatible Android browser with NFC enabled.
                </p>
                <div className="text-[11px] text-amber-700 space-y-1 pt-1">
                  <p>&bull; Target: Android phone with physical NFC hardware enabled in Settings</p>
                  <p>&bull; Browser: Google Chrome for Android over HTTPS (or localhost during development)</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scan Error Alert */}
        {errorMessage && (
          <div className="mt-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-left text-xs text-rose-800 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Scan Error:</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Decoded Tag & Matched Pouch Details Card */}
      {isLookingUp && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-600 font-medium">Looking up pouch in factory database...</p>
        </div>
      )}

      {lookupError && !isLookingUp && (
        <div className="p-5 bg-white rounded-2xl border border-rose-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-rose-700 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Unregistered or Unknown Tag</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {lookupError}
          </p>
          {lastScan?.rawPayload && (
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-800">
              Raw Payload: <span className="font-bold">{lastScan.rawPayload}</span>
            </div>
          )}
          <div className="pt-2 flex gap-2">
            <button
              onClick={() => navigate('/pouches/new')}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow transition-colors"
            >
              Register This Pouch Now
            </button>
            <button
              onClick={handleResetScan}
              className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Matched Pouch & Movement Confirmation Section */}
      {matchedPouch && !isLookingUp && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-5 animate-slide-up">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pouch Identified
              </span>
              <div className="flex items-center space-x-3 mt-0.5">
                <span className="text-xl font-mono font-black text-slate-900">
                  {matchedPouch.serialNumber}
                </span>
                <StatusBadge status={matchedPouch.status} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Batch: <span className="font-semibold text-slate-700">{matchedPouch.batchNumber}</span> &bull; {matchedPouch.pouchType}
              </p>
            </div>

            <button
              onClick={() => navigate(`/pouches/${matchedPouch.id}`)}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
            >
              View Full Details
            </button>
          </div>

          {/* Movement Transition Diagram */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Checkpoint Transition Plan
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* Current */}
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Location</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">
                  {matchedPouch.currentDepartment?.name}
                </span>
                <span className="text-xs text-slate-500">
                  &rarr; {matchedPouch.currentCheckpoint?.name}
                </span>
              </div>

              {/* Destination */}
              <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-200">
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Target Location</span>
                <span className="text-xs font-bold text-blue-900 block mt-0.5">
                  {selectedCheckpoint?.name || 'Selected Destination'}
                </span>
                <span className="text-xs text-blue-700">
                  Checkpoint ID: {selectedCheckpointId}
                </span>
              </div>
            </div>
          </div>

          {/* Raw Tag Inspection Data Accordion */}
          {lastScan && (
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span>NDEF Format:</span>
                <span className="font-bold text-slate-800">{lastScan.rawPayload}</span>
              </div>
              {lastScan.tagUid && (
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span>Tag Hardware UID:</span>
                  <span className="text-slate-700">{lastScan.tagUid}</span>
                </div>
              )}
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span>Record Type:</span>
                <span className="text-slate-700">{lastScan.recordType}</span>
              </div>
            </div>
          )}

          {/* Movement Confirmation Statuses */}
          {movementSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Movement Recorded Successfully!</span>
                <span className="text-xs">
                  Pouch {matchedPouch.serialNumber} is now officially logged at {movementSuccess.newCheckpoint?.name}.
                </span>
              </div>
            </div>
          )}

          {movementError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Movement Rejected:</span>
                <span className="text-xs">{movementError}</span>
              </div>
            </div>
          )}

          {/* Confirmation Action Button */}
          {!movementSuccess && (
            <button
              onClick={handleConfirmMovement}
              disabled={isRecording}
              className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center space-x-2 text-base"
            >
              {isRecording ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Recording in Factory Ledger...</span>
                </>
              ) : (
                <>
                  <span>Confirm Movement to Checkpoint</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          )}

          {movementSuccess && (
            <button
              onClick={handleResetScan}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow transition-colors"
            >
              Scan Next Pouch
            </button>
          )}
        </div>
      )}

      {/* Developer NFC Simulation Tool (Explicitly Labeled for Testing without Physical Android NFC) */}
      <div className="p-4 bg-slate-100 rounded-2xl border border-slate-300 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Developer NFC Hardware Simulator
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-200 text-amber-800 font-bold">
            TESTING AID
          </span>
        </div>
        <p className="text-xs text-slate-600">
          Enables full testing of the Web NFC decoding pipeline and movement workflows on desktop browsers without physical Android NFC tags.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={simulatedSerialInput}
            onChange={(e) => setSimulatedSerialInput(e.target.value)}
            placeholder="e.g. PCH-000101"
            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
          />
          <button
            onClick={() => simulateScan(simulatedSerialInput)}
            className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center justify-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Physical Tag Tap</span>
          </button>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-slate-500 mr-1">Presets:</span>
          {['PCH-000101', 'PCH-000105', 'PCH-000115', 'PCH-000125'].map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setSimulatedSerialInput(preset);
                simulateScan(preset);
              }}
              className="text-[11px] font-mono px-2 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded text-slate-700"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Scans Session Feed */}
      {recentScans.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Recent Scan History This Session</span>
            </h4>
            <span className="text-xs text-slate-400">{recentScans.length} scans</span>
          </div>

          <div className="divide-y divide-slate-100">
            {recentScans.map((scan, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-slate-900 mr-2">{scan.serialNumber}</span>
                  <span className="text-slate-500">
                    {scan.department} &rarr; {scan.checkpoint}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusBadge status={scan.status} size="sm" />
                  <span className="text-[10px] text-slate-400 font-mono">
                    {scan.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
