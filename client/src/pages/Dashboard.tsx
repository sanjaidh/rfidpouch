import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Search,
  ArrowRight,
  TrendingUp,
  Layers,
  RefreshCw,
  SlidersHorizontal,
  Box,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useNavigate } from '../router';
import { useSocket } from '../hooks/useSocket';

const STATUS_COLORS: Record<string, string> = {
  Registered: '#3b82f6',
  'Awaiting Processing': '#06b6d4',
  'In Production': '#6366f1',
  'Quality Inspection': '#a855f7',
  Packaging: '#f59e0b',
  Completed: '#10b981',
  Dispatched: '#14b8a6',
  'On Hold': '#f97316',
  Delayed: '#f43f5e',
};

export const Dashboard: React.FC = () => {
  const { navigate } = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchSerial, setSearchSerial] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.getDashboardSummary();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Subscribe to live socket events for instantaneous updates
  useSocket((event) => {
    if (event === 'dashboard:update' || event === 'movement:recorded') {
      loadDashboard();
    }
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchSerial.trim()) {
      navigate('/pouches', { search: searchSerial.trim() });
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-3">
          <Radio className="w-10 h-10 text-blue-600 animate-pulse" />
          <p className="text-sm text-slate-500 font-medium">Connecting to factory telemetry...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalPouches: 0,
    inProduction: 0,
    awaitingProcessing: 0,
    completed: 0,
    delayed: 0,
    scansToday: 0,
    openAlerts: 0,
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Quick Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Factory Floor Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time NFC pouch tracking &bull; Live operational metrics
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              placeholder="Search serial / batch..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </form>

          {/* 3D Digital Twin shortcut button */}
          <button
            onClick={() => navigate('/twin')}
            className="py-2 px-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5"
            title="Open Interactive 3D Digital Twin"
          >
            <Box className="w-4 h-4 animate-pulse" />
            <span className="hidden sm:inline">3D Digital Twin</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={loadDashboard}
            disabled={refreshing}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-xs transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Pouches */}
        <div
          onClick={() => navigate('/pouches')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-blue-600">
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 block font-mono">
              {metrics.totalPouches}
            </span>
            <span className="text-[11px] text-slate-500">Active registered</span>
          </div>
        </div>

        {/* In Production */}
        <div
          onClick={() => navigate('/pouches', { status: 'In Production' })}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-indigo-500">
            <Activity className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">WIP</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-indigo-950 block font-mono">
              {metrics.inProduction}
            </span>
            <span className="text-[11px] text-indigo-600 font-medium">In Production</span>
          </div>
        </div>

        {/* Awaiting Processing */}
        <div
          onClick={() => navigate('/pouches', { status: 'Awaiting Processing' })}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-cyan-500">
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Queue</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-cyan-950 block font-mono">
              {metrics.awaitingProcessing}
            </span>
            <span className="text-[11px] text-cyan-600 font-medium">Awaiting Process</span>
          </div>
        </div>

        {/* Completed */}
        <div
          onClick={() => navigate('/pouches', { status: 'Completed' })}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Finished</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950 block font-mono">
              {metrics.completed}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Completed</span>
          </div>
        </div>

        {/* Delayed */}
        <div
          onClick={() => navigate('/pouches', { status: 'Delayed' })}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-rose-500">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delayed</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-950 block font-mono">
              {metrics.delayed}
            </span>
            <span className="text-[11px] text-rose-600 font-medium">Overdue WIP</span>
          </div>
        </div>

        {/* Scans Today */}
        <div
          onClick={() => navigate('/history')}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-2xl text-white shadow-md shadow-blue-500/20 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-blue-200">
            <Radio className="w-5 h-5 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Today</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-white block font-mono">
              {metrics.scansToday}
            </span>
            <span className="text-[11px] text-blue-100 font-medium">NFC Scans Recorded</span>
          </div>
        </div>
      </div>

      {/* Prominent Scan Action CTA for Mobile */}
      <div className="sm:hidden bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl text-white shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Radio className="w-7 h-7 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Scan Factory NFC Tag</h3>
            <p className="text-[11px] text-blue-100">Bring phone close to physical pouch</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/scan')}
          className="py-2 px-4 bg-white text-blue-600 font-bold rounded-xl text-xs shadow"
        >
          Open Scanner
        </button>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Movement Activity Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Daily Checkpoint Movement Volume</span>
              </h3>
              <p className="text-xs text-slate-500">Successful scans recorded over past 7 days</p>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.dailyVolume || []}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => val.slice(5)}
                  fontSize={11}
                  stroke="#94a3b8"
                />
                <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip
                  labelFormatter={(val) => `Date: ${val}`}
                  formatter={(val: any) => [`${val} Movements`, 'Success']}
                />
                <Area
                  type="monotone"
                  dataKey="success"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSuccess)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pouches by Department Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Pouches by Factory Department</span>
              </h3>
              <p className="text-xs text-slate-500">Live inventory across 8 production departments</p>
            </div>
            <button
              onClick={() => navigate('/checkpoints')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>Checkpoints</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.pouchesByDepartment || []}
                layout="vertical"
                margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
              >
                <XAxis type="number" fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="departmentName"
                  fontSize={10}
                  stroke="#64748b"
                  width={110}
                  tickFormatter={(val) => (val.length > 15 ? val.slice(0, 14) + '…' : val)}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Scan Activity & Open Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scan Activity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <Radio className="w-4 h-4 text-blue-600" />
                <span>Recent Movement Events</span>
              </h3>
              <p className="text-xs text-slate-500">Real-time checkpoint scan log</p>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {(!data?.recentActivity || data.recentActivity.length === 0) ? (
              <p className="py-6 text-center text-xs text-slate-400">No scans recorded yet.</p>
            ) : (
              data.recentActivity.map((act: any) => (
                <div
                  key={act.id}
                  onClick={() => navigate(`/pouches/${act.pouchId}`)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {act.pouchSerialNumber}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        via {act.source === 'phone_nfc' ? 'NFC Phone' : act.source}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      &rarr; <span className="font-medium text-slate-800">{act.newDepartment?.name}</span> ({act.newCheckpoint?.name})
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <StatusBadge status={act.newStatus} size="sm" />
                    <div className="text-[10px] text-slate-400 font-mono">
                      {new Date(act.occurredAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Exceptions & Open Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Shopfloor Exceptions Requiring Review</span>
              </h3>
              <p className="text-xs text-slate-500">Workflow violations and unknown tag alerts</p>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800"
            >
              Alerts Hub ({metrics.openAlerts})
            </button>
          </div>

          <div className="space-y-2.5">
            {(!data?.recentExceptions || data.recentExceptions.length === 0) ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                <span>No active exceptions. All checkpoint workflows normal.</span>
              </div>
            ) : (
              data.recentExceptions.map((ex: any) => (
                <div
                  key={ex.id}
                  onClick={() => navigate('/alerts')}
                  className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 transition-colors cursor-pointer space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-900 uppercase text-[10px] tracking-wider">
                      {ex.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(ex.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-snug">{ex.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
