import React, { useState } from 'react';
import { Radio, Search, Wifi, ShieldAlert, Cpu } from 'lucide-react';
import { useNavigate } from '../router';

interface NavbarProps {
  onSearch?: (term: string) => void;
  isNfcSupported: boolean;
  simulatorMode: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isNfcSupported, simulatorMode }) => {
  const { navigate, currentRoute } = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate('/pouches', { search: searchTerm.trim() });
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">PouchTrack</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-blue-100 text-blue-700 rounded-md">
                  NFC Real-Time
                </span>
              </div>
              <p className="text-[11px] text-slate-500 -mt-0.5 hidden sm:block">
                Factory Pouch Traceability &bull; Direct Access (No Login)
              </p>
            </div>
          </div>

          {/* Quick Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center flex-1 max-w-xs mx-6"
          >
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Lookup PCH-000123..."
                className="w-full pl-9 pr-3.5 py-1.5 bg-slate-100 focus:bg-white border border-transparent focus:border-blue-500 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
              />
            </div>
          </form>

          {/* Right Status Badges */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* NFC Hardware Status Pill */}
            {isNfcSupported ? (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
                <Radio className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Web NFC Hardware Ready</span>
                <span className="sm:hidden">NFC Ready</span>
              </div>
            ) : simulatorMode ? (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">
                <Cpu className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Dev NFC Simulator</span>
                <span className="sm:hidden">Simulator</span>
              </div>
            ) : (
              <div
                onClick={() => navigate('/diagnostics')}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-medium cursor-pointer hover:bg-slate-200 transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">NFC Diagnostics</span>
                <span className="sm:hidden">Diag</span>
              </div>
            )}

            {/* Live Socket Feed Indicator */}
            <div className="flex items-center space-x-1 px-2 py-1 text-slate-500 text-xs font-mono" title="Live WebSocket connection active">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden lg:inline text-[11px] text-slate-400">LIVE</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
