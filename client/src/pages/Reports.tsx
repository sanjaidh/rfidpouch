import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Layers,
  PieChart as PieChartIcon,
  TrendingUp,
  AlertTriangle,
  Radio,
  Clock,
  ArrowRight,
  Download,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useNavigate } from '../router';

const STATUS_COLORS = [
  '#3b82f6',
  '#06b6d4',
  '#6366f1',
  '#a855f7',
  '#f59e0b',
  '#10b981',
  '#14b8a6',
  '#f97316',
  '#f43f5e',
];

const TAG_COLORS = ['#10b981', '#f59e0b'];

export const Reports: React.FC = () => {
  const { navigate } = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReports().then((res) => {
      if (res.success) {
        setData(res.report);
      }
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const { metrics, pouchesByDepartment, statusDistribution, dailyVolume, overduePouches, alertFrequency, tagStats } = data;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <BarChart3 className="w-6 h-6 text-teal-600" />
          <span>Factory Traceability & Throughput Reports</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time metrics computed directly from database tracking events
        </p>
      </div>

      {/* Top 3 Summary Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Active Inventory</span>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">{metrics.totalPouches} Pouches</div>
          <p className="text-xs text-slate-500 mt-0.5">Across 8 factory departments</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">NFC Tag Programming Rate</span>
          <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
            {metrics.totalPouches > 0
              ? `${Math.round((metrics.programmedTags / metrics.totalPouches) * 100)}%`
              : '0%'}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {metrics.programmedTags} of {metrics.totalPouches} tags written
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Today's Scan Activity</span>
          <div className="text-2xl font-black font-mono text-blue-600 mt-1">{metrics.scansToday} Scans</div>
          <p className="text-xs text-slate-500 mt-0.5">{metrics.totalMovements} historical total movements</p>
        </div>
      </div>

      {/* Charts Row 1: Status Distribution & NFC Tag Programming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <PieChartIcon className="w-4 h-4 text-purple-600" />
              <span>Pouch Status Distribution</span>
            </h3>
            <p className="text-xs text-slate-500">Live breakdown of active pouches by workflow status</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {statusDistribution.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tag Programming Donut Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <Radio className="w-4 h-4 text-emerald-600" />
              <span>NFC Tag Hardware Programming Status</span>
            </h3>
            <p className="text-xs text-slate-500">Inventory readiness for mobile phone touch-scanning</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tagStats}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={4}
                >
                  {tagStats.map((entry: any, index: number) => (
                    <Cell key={`cell-tag-${index}`} fill={TAG_COLORS[index % TAG_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Department Volume & Daily Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Inventory Bar Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Inventory by Factory Department</span>
            </h3>
            <p className="text-xs text-slate-500">Distribution across 8 factory stages</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pouchesByDepartment} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="departmentName"
                  angle={-25}
                  textAnchor="end"
                  fontSize={10}
                  stroke="#94a3b8"
                  interval={0}
                />
                <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Movement Area Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Daily Checkpoint Scan Volume</span>
            </h3>
            <p className="text-xs text-slate-500">Pouch transit volume over the past 7 days</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyVolume}>
                <defs>
                  <linearGradient id="colorReportSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => val.slice(5)}
                  fontSize={11}
                  stroke="#94a3b8"
                />
                <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="success"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReportSuccess)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Overdue Pouches Table (Processing time exceeding threshold) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-rose-600" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Overdue Pouches at Checkpoints</h3>
              <p className="text-xs text-slate-500">
                Pouches residing at a checkpoint longer than 48 hours without forward movement
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-600 px-2.5 py-1 bg-rose-50 rounded-lg">
            {overduePouches?.length || 0} Pouches Flagged
          </span>
        </div>

        {(!overduePouches || overduePouches.length === 0) ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No overdue pouches. Factory throughput is within normal processing windows.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-[10px] text-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Serial</th>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3">Station</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Last Move</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overduePouches.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.serialNumber}</td>
                    <td className="py-2.5 px-3 text-slate-500">{p.batchNumber}</td>
                    <td className="py-2.5 px-3">
                      {p.currentDepartment?.name} &rarr; {p.currentCheckpoint?.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => navigate(`/pouches/${p.id}`)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
