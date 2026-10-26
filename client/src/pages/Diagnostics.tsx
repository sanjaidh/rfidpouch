import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Server,
  Database,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  RefreshCw,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { useWebNfc } from '../hooks/useWebNfc';
import { api } from '../services/api';

export const Diagnostics: React.FC = () => {
  const {
    isSupported,
    isSecureContext,
    isScanning,
    status,
    lastScan,
    errorMessage,
    simulatorMode,
    setSimulatorMode,
  } = useWebNfc();

  const [backendDiagnostics, setBackendDiagnostics] = useState<any | null>(null);
  const [loadingBackend, setLoadingBackend] = useState(true);
  const [testPayloadInput, setTestPayloadInput] = useState('POUCH:PCH-000123');
  const [testParseResult, setTestParseResult] = useState<any | null>(null);

  const loadBackendDiagnostics = async () => {
    setLoadingBackend(true);
    try {
      const res = await api.getDiagnostics();
      if (res.success) {
        setBackendDiagnostics(res.diagnostics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBackend(false);
    }
  };

  useEffect(() => {
    loadBackendDiagnostics();
  }, []);

  const handleTestParse = async () => {
    try {
      const res = await api.testScanPayload(testPayloadInput);
      setTestParseResult(res.result);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <Wrench className="w-6 h-6 text-slate-700" />
          <span>System & NFC Diagnostics</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time hardware API compatibility, secure context validation, and database telemetry
        </p>
      </div>

      {/* Browser Web NFC Hardware API Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Browser Web NFC API (NDEFReader)</h3>
          </div>
          {isSupported ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Supported</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Unavailable</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Window.NDEFReader Feature Detection
            </span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {isSupported ? 'window.NDEFReader Present' : 'window.NDEFReader Undefined'}
            </span>
            <p className="text-[11px] text-slate-500">
              {isSupported
                ? 'Browser natively exposes Web NFC scanner and writer.'
                : !isSecureContext
                ? 'Chrome hides window.NDEFReader over insecure HTTP. Use HTTPS or set the Chrome flag.'
                : 'Not supported on this browser/OS.'}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Secure Context (HTTPS or localhost)
            </span>
            <span className={`font-mono font-bold text-sm ${isSecureContext ? 'text-emerald-700' : 'text-amber-600'}`}>
              {isSecureContext ? 'Secure Context (Active)' : 'Insecure Origin (HTTP)'}
            </span>
            <p className="text-[11px] text-slate-500">
              {isSecureContext
                ? 'Origin is trusted. Chrome permits access to physical NFC hardware.'
                : 'Web NFC strictly requires HTTPS or chrome://flags/#unsafely-treat-insecure-origin-as-secure.'}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Scanner State</span>
            <span className="font-mono font-bold text-slate-800 text-sm capitalize">{status}</span>
            <p className="text-[11px] text-slate-500">
              Hardware antenna is {isScanning ? 'actively polling' : 'idle'}.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Last Decoded Tag</span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {lastScan ? lastScan.serialNumber || 'Invalid Tag' : 'No tag read yet'}
            </span>
            <p className="text-[11px] text-slate-500 font-mono">
              {lastScan?.timestamp ? lastScan.timestamp.toLocaleTimeString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* Diagnostic error report */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
            <span className="font-bold block">Last Recorded NFC Error:</span>
            <p>{errorMessage}</p>
          </div>
        )}
      </div>

      {/* Physical Device Testing Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
          <Radio className="w-5 h-5 text-indigo-600" />
          <span>Troubleshooting & Physical Android Setup Checklist</span>
        </h3>
        <p className="text-xs text-slate-500">
          Follow these 6 steps to test real NFC tags on shopfloor Android devices:
        </p>

        <ol className="space-y-3 text-xs text-slate-700">
          <li className="flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
              1
            </span>
            <div>
              <span className="font-bold text-slate-800">Use a compatible Android phone: </span>
              Ensure your phone has built-in NFC hardware (most Samsung Galaxy, Google Pixel, Xiaomi, Motorola devices).
            </div>
          </li>
          <li className="flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
              2
            </span>
            <div>
              <span className="font-bold text-slate-800">Enable NFC in Android System Settings: </span>
              Go to Settings &rarr; Connected Devices / Connections &rarr; Toggle <strong>NFC ON</strong>.
            </div>
          </li>
          <li className="flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
              3
            </span>
            <div>
              <span className="font-bold text-slate-800">Secure Context in Google Chrome for Android: </span>
              Web NFC requires a Secure Context. If connecting over Wi-Fi (e.g. <code>http://192.168.x.x:5173</code>), launch with HTTPS (<code>npm run dev:https</code>) or add your IP to Chrome flag: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>.
            </div>
          </li>
          <li className="flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
              4
            </span>
            <div>
              <span className="font-bold text-slate-800">Grant Browser Permission: </span>
              When tapping "Start NFC Scan", tap "Allow" if Chrome prompts for NFC permission.
            </div>
          </li>
          <li className="flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
              5
            </span>
            <div>
              <span className="font-bold text-slate-800">Use compatible writable NDEF tags: </span>
              Compatible with standard NTAG213, NTAG215, NTAG216, Mifare Ultralight, or any NFC Forum Type 2/4 tag.
            </div>
          </li>
          <li className="flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
              6
            </span>
            <div>
              <span className="font-bold text-slate-800">Align Phone Antenna: </span>
              Hold the top or center back of the phone against the tag for 0.5-1 second until the phone vibrates or beeps.
            </div>
          </li>
        </ol>
      </div>

      {/* Backend & Database Health Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-sm">Backend API & Database Telemetry</h3>
          </div>
          <button
            onClick={loadBackendDiagnostics}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw className={`w-4 h-4 ${loadingBackend ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {backendDiagnostics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">DB Status</span>
              <span className="font-bold text-emerald-600">Connected</span>
              <span className="text-[10px] text-slate-400 block font-mono">
                {backendDiagnostics.database?.latencyMs}ms latency
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">DB Pouches</span>
              <span className="font-bold text-slate-900 text-base font-mono">
                {backendDiagnostics.database?.counts?.pouches}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Movements</span>
              <span className="font-bold text-slate-900 text-base font-mono">
                {backendDiagnostics.database?.counts?.movements}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Server Uptime</span>
              <span className="font-bold text-slate-900 text-base font-mono">
                {backendDiagnostics.uptimeSeconds}s
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Payload Parser Test Sandbox */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
          <Code2 className="w-5 h-5 text-blue-600" />
          <span>NDEF Payload Parser & Validator Sandbox</span>
        </h3>
        <p className="text-xs text-slate-500">
          Verify payload formatting against factory standards (<code className="font-mono text-blue-600">POUCH:&lt;SERIAL&gt;</code>)
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={testPayloadInput}
            onChange={(e) => setTestPayloadInput(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
          />
          <button
            onClick={handleTestParse}
            className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow"
          >
            Test Parse
          </button>
        </div>

        {testParseResult && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono space-y-1">
            <div className="flex justify-between">
              <span>Valid Pouch Tag:</span>
              <span className={testParseResult.valid ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>
                {testParseResult.valid ? 'YES' : 'NO'}
              </span>
            </div>
            {testParseResult.serialNumber && (
              <div className="flex justify-between">
                <span>Extracted Serial:</span>
                <span className="font-bold text-blue-600">{testParseResult.serialNumber}</span>
              </div>
            )}
            {testParseResult.errorMessage && (
              <div className="text-rose-600 text-[11px] pt-1">
                Notice: {testParseResult.errorMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
