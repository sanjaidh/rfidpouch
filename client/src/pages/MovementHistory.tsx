import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Radio,
  User,
  Calendar,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useNavigate } from '../router';

export const MovementHistory: React.FC = () => {
  const { navigate, queryParams } = useNavigate();

  const [movements, setMovements] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [pouchSerialNumber, setPouchSerialNumber] = useState(queryParams.serial || '');
  const [batchNumber, setBatchNumber] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [source, setSource] = useState('all');
  const [result, setResult] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMovements({
        pouchSerialNumber: pouchSerialNumber.trim(),
        batchNumber: batchNumber.trim(),
        operatorName: operatorName.trim(),
        source: source !== 'all' ? source : '',
        result: result !== 'all' ? result : '',
        startDate,
        endDate,
        limit: 100,
      });

      if (res.success) {
        setMovements(res.movements);
        setTotal(res.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pouchSerialNumber, batchNumber, operatorName, source, result, startDate, endDate]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const handleResetFilters = () => {
    setPouchSerialNumber('');
    setBatchNumber('');
    setOperatorName('');
    setSource('all');
    setResult('all');
    setStartDate('');
    setEndDate('');
  };

  const handleDownloadCsv = () => {
    const url = api.getMovementCsvUrl({
      pouchSerialNumber: pouchSerialNumber.trim(),
      batchNumber: batchNumber.trim(),
      operatorName: operatorName.trim(),
      source: source !== 'all' ? source : '',
      result: result !== 'all' ? result : '',
      startDate,
      endDate,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <History className="w-6 h-6 text-blue-600" />
            <span>Factory Movement History</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable append-only ledger of physical pouch checkpoint movements ({total} events)
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="py-2 px-3.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export History CSV</span>
        </button>
      </div>

      {/* Filter Panel */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter Movements</span>
          </span>
          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Serial Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={pouchSerialNumber}
              onChange={(e) => setPouchSerialNumber(e.target.value)}
              placeholder="Filter serial (e.g. PCH-000101)"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Batch Filter */}
          <input
            type="text"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="Filter batch number..."
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />

          {/* Source Filter */}
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Scan Sources</option>
            <option value="phone_nfc">Phone NFC Hardware</option>
            <option value="manual_entry">Manual Operator Entry</option>
            <option value="simulator">Developer Simulator</option>
            <option value="admin_correction">Admin Correction</option>
          </select>

          {/* Result Filter */}
          <select
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Outcomes</option>
            <option value="success">Successful Movements</option>
            <option value="rejected">Rejected Attempts</option>
          </select>

          {/* Start Date */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Retrieving factory movement ledger...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <History className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm">No movement records match filters</h3>
            <p className="text-xs text-slate-400">Try resetting filters or record a new movement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Timestamp (Local)</th>
                  <th className="py-3.5 px-4">Pouch</th>
                  <th className="py-3.5 px-4">Movement (From &rarr; To)</th>
                  <th className="py-3.5 px-4">Status Transition</th>
                  <th className="py-3.5 px-4">Operator</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => {
                  const isRejected = m.result === 'rejected';

                  return (
                    <tr
                      key={m.id}
                      onClick={() => navigate(`/pouches/${m.pouchId}`)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                        isRejected ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                        <div className="font-medium">{new Date(m.occurredAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">{new Date(m.occurredAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600">
                          {m.pouchSerialNumber}
                        </span>
                        {m.pouch?.batchNumber && (
                          <div className="text-[10px] text-slate-400">{m.pouch.batchNumber}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-500 text-[11px]">
                          {m.previousDepartment ? `${m.previousDepartment.name} (${m.previousCheckpoint?.name})` : 'Start (Receiving)'}
                        </div>
                        <div className="font-semibold text-slate-800 text-xs">
                          &rarr; {m.newDepartment.name} ({m.newCheckpoint.name})
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          {m.previousStatus && (
                            <>
                              <span className="text-[11px] text-slate-400">{m.previousStatus}</span>
                              <span className="text-slate-300">&rarr;</span>
                            </>
                          )}
                          <StatusBadge status={m.newStatus} size="sm" />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                        {m.operatorName || 'Operator'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
                          {m.source === 'phone_nfc' ? 'Phone NFC' : m.source}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isRejected ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Success</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
