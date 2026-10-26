import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  Filter,
  Plus,
  Radio,
  MapPin,
  Download,
  ChevronRight,
  ExternalLink,
  Edit2,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { WriteTagModal } from '../components/WriteTagModal';
import { RecordMovementModal } from '../components/RecordMovementModal';
import { useNavigate } from '../router';

export const PouchRegistry: React.FC = () => {
  const { navigate, queryParams } = useNavigate();

  const [pouches, setPouches] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(queryParams.search || '');
  const [departmentId, setDepartmentId] = useState(queryParams.departmentId || 'all');
  const [status, setStatus] = useState(queryParams.status || 'all');
  const [tagProgrammed, setTagProgrammed] = useState('all');

  const [departments, setDepartments] = useState<any[]>([]);

  // Modals
  const [writeTagPouch, setWriteTagPouch] = useState<any | null>(null);
  const [recordMovementPouch, setRecordMovementPouch] = useState<any | null>(null);

  // Load departments
  useEffect(() => {
    api.getDepartments().then((res) => {
      if (res.success) setDepartments(res.departments);
    });
  }, []);

  const loadPouches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPouches({
        search,
        departmentId: departmentId !== 'all' ? departmentId : '',
        status: status !== 'all' ? status : '',
        tagProgrammed: tagProgrammed !== 'all' ? tagProgrammed : '',
        limit: 100,
      });

      if (res.success) {
        setPouches(res.pouches);
        setTotal(res.total);
      }
    } catch (err) {
      console.error('Failed to load pouches:', err);
    } finally {
      setLoading(false);
    }
  }, [search, departmentId, status, tagProgrammed]);

  useEffect(() => {
    loadPouches();
  }, [loadPouches]);

  const handleDeactivate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to toggle active status for this pouch?')) return;

    try {
      const p = pouches.find((item) => item.id === id);
      await api.updatePouch(id, { active: !p.active });
      loadPouches();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Serial Number',
      'Batch Number',
      'Pouch Type',
      'Department',
      'Checkpoint',
      'Status',
      'Tag Programmed',
      'Active',
      'Registered At',
      'Last Scanned At',
    ];

    const rows = pouches.map((p) => [
      p.serialNumber,
      p.batchNumber,
      `"${p.pouchType}"`,
      p.currentDepartment?.name || 'N/A',
      p.currentCheckpoint?.name || 'N/A',
      p.status,
      p.tagProgrammed ? 'YES' : 'NO',
      p.active ? 'YES' : 'NO',
      new Date(p.registeredAt).toISOString(),
      p.lastScannedAt ? new Date(p.lastScannedAt).toISOString() : 'Never',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pouchtrack-registry-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Package className="w-6 h-6 text-blue-600" />
            <span>Pouch Registry</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Database of physical pouches tracked across the factory floor ({total} registered)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => navigate('/pouches/new')}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Register Pouch</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search serial, batch, type..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="Registered">Registered</option>
            <option value="Awaiting Processing">Awaiting Processing</option>
            <option value="In Production">In Production</option>
            <option value="Quality Inspection">Quality Inspection</option>
            <option value="Packaging">Packaging</option>
            <option value="Completed">Completed</option>
            <option value="Dispatched">Dispatched</option>
            <option value="On Hold">On Hold</option>
            <option value="Delayed">Delayed</option>
          </select>

          {/* Tag Status Filter */}
          <select
            value={tagProgrammed}
            onChange={(e) => setTagProgrammed(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">All Tag Programming States</option>
            <option value="true">NFC Tag Programmed</option>
            <option value="false">Not Programmed</option>
          </select>
        </div>
      </div>

      {/* Pouches List (Cards on Mobile, Table on Desktop) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Querying registry database...</p>
          </div>
        ) : pouches.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm">No pouches found</h3>
            <p className="text-xs text-slate-400">Try adjusting your filters or register a new pouch.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Serial & Type</th>
                    <th className="py-3.5 px-4">Batch</th>
                    <th className="py-3.5 px-4">NFC Status</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Last Scanned</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pouches.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/pouches/${p.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-blue-600 text-sm">
                          {p.serialNumber}
                        </div>
                        <div className="text-[11px] text-slate-400">{p.pouchType}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{p.batchNumber}</td>
                      <td className="py-3.5 px-4">
                        {p.tagProgrammed ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            <Radio className="w-3 h-3 text-emerald-600" />
                            <span>Programmed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            <span>Not Programmed</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{p.currentDepartment?.name}</div>
                        <div className="text-[11px] text-slate-400">&rarr; {p.currentCheckpoint?.name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {p.lastScannedAt ? new Date(p.lastScannedAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className="flex items-center justify-end space-x-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setWriteTagPouch(p)}
                            title="Program NFC Tag"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Radio className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRecordMovementPouch(p)}
                            title="Record Checkpoint Movement"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden divide-y divide-slate-100">
              {pouches.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/pouches/${p.id}`)}
                  className="p-4 space-y-3 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900 text-base">{p.serialNumber}</span>
                      <span className="text-xs text-slate-400 ml-2">Batch: {p.batchNumber}</span>
                    </div>
                    <StatusBadge status={p.status} size="sm" />
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.currentDepartment?.name} &rarr; {p.currentCheckpoint?.name}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        {p.tagProgrammed ? (
                          <span className="text-emerald-700 text-[11px] font-semibold flex items-center space-x-1">
                            <Radio className="w-3 h-3 text-emerald-600" />
                            <span>NFC Tag Programmed</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 text-[11px] font-semibold">
                            NFC Tag Not Programmed
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {p.lastScannedAt ? new Date(p.lastScannedAt).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div
                    className="flex items-center justify-between pt-2 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setWriteTagPouch(p)}
                      className="py-1 px-2.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-1"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Program Tag</span>
                    </button>

                    <button
                      onClick={() => setRecordMovementPouch(p)}
                      className="py-1 px-2.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Move</span>
                    </button>

                    <button
                      onClick={() => navigate(`/pouches/${p.id}`)}
                      className="text-xs text-slate-500 font-semibold flex items-center"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Write Tag Modal */}
      {writeTagPouch && (
        <WriteTagModal
          isOpen={Boolean(writeTagPouch)}
          onClose={() => setWriteTagPouch(null)}
          pouch={writeTagPouch}
          onSuccess={loadPouches}
          onNavigateToScan={() => navigate('/scan')}
        />
      )}

      {/* Record Movement Modal */}
      {recordMovementPouch && (
        <RecordMovementModal
          isOpen={Boolean(recordMovementPouch)}
          onClose={() => setRecordMovementPouch(null)}
          pouch={recordMovementPouch}
          onSuccess={loadPouches}
        />
      )}
    </div>
  );
};
