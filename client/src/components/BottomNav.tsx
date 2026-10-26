import React, { useState } from 'react';
import { LayoutDashboard, Radio, Package, History, MoreHorizontal, Layers, AlertCircle, BarChart3, Wrench, X, Box } from 'lucide-react';
import { useNavigate } from '../router';

export const BottomNav: React.FC = () => {
  const { currentRoute, navigate } = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && currentRoute === '/') return true;
    if (path !== '/' && currentRoute.startsWith(path)) return true;
    return false;
  };

  const handleNav = (path: string) => {
    setShowMoreMenu(false);
    navigate(path);
  };

  return (
    <>
      {/* Mobile More Drawer / Popup */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 animate-slide-up space-y-3 pb-24">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">More Factory Modules</span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleNav('/twin')}
                className="col-span-2 flex items-center space-x-3 p-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors text-left border border-blue-200 shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Box className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-900">3D Digital Twin</div>
                  <div className="text-[10px] text-blue-600">Interactive 3D zone locator & floorplan</div>
                </div>
              </button>

              <button
                onClick={() => handleNav('/checkpoints')}
                className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors text-left border border-slate-200"
              >
                <Layers className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="text-xs font-semibold">Checkpoints</div>
                  <div className="text-[10px] text-slate-400">8 Departments</div>
                </div>
              </button>

              <button
                onClick={() => handleNav('/alerts')}
                className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors text-left border border-slate-200"
              >
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <div>
                  <div className="text-xs font-semibold">Exceptions</div>
                  <div className="text-[10px] text-slate-400">Alerts & review</div>
                </div>
              </button>

              <button
                onClick={() => handleNav('/reports')}
                className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors text-left border border-slate-200"
              >
                <BarChart3 className="w-5 h-5 text-teal-600" />
                <div>
                  <div className="text-xs font-semibold">Reports</div>
                  <div className="text-[10px] text-slate-400">Throughput charts</div>
                </div>
              </button>

              <button
                onClick={() => handleNav('/diagnostics')}
                className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors text-left border border-slate-200"
              >
                <Wrench className="w-5 h-5 text-slate-600" />
                <div>
                  <div className="text-xs font-semibold">NFC Diagnostics</div>
                  <div className="text-[10px] text-slate-400">Hardware checks</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-bottom">
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {/* 1. Dashboard */}
          <button
            onClick={() => handleNav('/')}
            className={`flex flex-col items-center justify-center h-full py-1 transition-colors ${
              isActive('/') ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Dashboard</span>
          </button>

          {/* 2. Scan NFC - Prominent Center Action */}
          <div className="flex justify-center -mt-5">
            <button
              onClick={() => handleNav('/scan')}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform active:scale-95 ${
                isActive('/scan')
                  ? 'bg-blue-600 text-white shadow-blue-500/40 ring-4 ring-blue-100'
                  : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/30'
              }`}
              aria-label="Scan NFC Tag"
            >
              <Radio className="w-7 h-7 animate-pulse" />
            </button>
          </div>

          {/* 3. Pouches */}
          <button
            onClick={() => handleNav('/pouches')}
            className={`flex flex-col items-center justify-center h-full py-1 transition-colors ${
              isActive('/pouches') ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Package className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Pouches</span>
          </button>

          {/* 4. History */}
          <button
            onClick={() => handleNav('/history')}
            className={`flex flex-col items-center justify-center h-full py-1 transition-colors ${
              isActive('/history') ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">History</span>
          </button>

          {/* 5. More */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center h-full py-1 transition-colors ${
              showMoreMenu ||
              isActive('/checkpoints') ||
              isActive('/alerts') ||
              isActive('/reports') ||
              isActive('/diagnostics')
                ? 'text-blue-600 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
