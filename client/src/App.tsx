import React from 'react';
import { useRouter } from './router';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { useWebNfc } from './hooks/useWebNfc';

// Pages
import { Dashboard } from './pages/Dashboard';
import { NfcScanner } from './pages/NfcScanner';
import { PouchRegistry } from './pages/PouchRegistry';
import { RegisterPouch } from './pages/RegisterPouch';
import { PouchDetails } from './pages/PouchDetails';
import { Checkpoints } from './pages/Checkpoints';
import { MovementHistory } from './pages/MovementHistory';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { Diagnostics } from './pages/Diagnostics';
import { DigitalTwin } from './pages/DigitalTwin';

export const App: React.FC = () => {
  const { currentRoute } = useRouter();
  const { isSupported, simulatorMode } = useWebNfc();

  const renderCurrentPage = () => {
    switch (currentRoute) {
      case '/':
        return <Dashboard />;
      case '/scan':
        return <NfcScanner />;
      case '/twin':
        return <DigitalTwin />;
      case '/pouches':
        return <PouchRegistry />;
      case '/pouches/new':
        return <RegisterPouch />;
      case '/pouches/:id':
        return <PouchDetails />;
      case '/checkpoints':
        return <Checkpoints />;
      case '/history':
        return <MovementHistory />;
      case '/alerts':
        return <Alerts />;
      case '/reports':
        return <Reports />;
      case '/diagnostics':
        return <Diagnostics />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <Navbar isNfcSupported={isSupported} simulatorMode={simulatorMode} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {renderCurrentPage()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default App;
