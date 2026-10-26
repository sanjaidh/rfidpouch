import React from 'react';
import {
  LayoutDashboard,
  Radio,
  Box,
  Package,
  PlusCircle,
  Layers,
  History,
  AlertCircle,
  BarChart3,
  Wrench,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from '../router';

export const Sidebar: React.FC = () => {
  const { currentRoute, navigate } = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: '3D Digital Twin', path: '/twin', icon: Box, highlight: true },
    { label: 'Scan NFC Tag', path: '/scan', icon: Radio, highlight: true },
    { label: 'Pouch Registry', path: '/pouches', icon: Package },
    { label: 'Register Pouch', path: '/pouches/new', icon: PlusCircle },
    { label: 'Factory Checkpoints', path: '/checkpoints', icon: Layers },
    { label: 'Movement History', path: '/history', icon: History },
    { label: 'Alerts & Exceptions', path: '/alerts', icon: AlertCircle },
    { label: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    { label: 'NFC Diagnostics', path: '/diagnostics', icon: Wrench },
  ];

  const isActive = (path: string) => {
    if (path === '/' && currentRoute === '/') return true;
    if (path !== '/' && currentRoute.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 select-none">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : item.highlight
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100/70 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 ${
                    active
                      ? 'text-white'
                      : item.highlight
                      ? 'text-blue-600 animate-pulse'
                      : 'text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {active && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
            </button>
          );
        })}
      </div>

      {/* Direct Access Security Notice */}
      <div className="mt-auto pt-6 border-t border-slate-200">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-2 text-slate-700 font-semibold text-[11px] mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Direct Shopfloor Access</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Zero-friction scanning mode enabled without login screens. Restrict network access via VPN or factory Wi-Fi in production.
          </p>
        </div>
      </div>
    </aside>
  );
};
