import React, { useState, useEffect } from 'react';
import { Home, Users, Settings as SettingsIcon, Menu, X, LogOut, FileOutput, CalendarCheck, TrendingUp, RefreshCw } from 'lucide-react';
import { cn } from './lib/utils';
import Dashboard from './pages/Dashboard';
import StudentsList from './pages/StudentsList';
import MutasiList from './pages/MutasiList';
import AttendancePrint from './pages/AttendancePrint';
import KenaikanKelas from './pages/KenaikanKelas';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { useStore } from './store';
import { fetchFromGAS } from './lib/api';

function App() {
  const { isAuthenticated, logout, settings, setStudents, students } = useStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'mutasi' | 'attendance' | 'kenaikan' | 'settings'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !settings.scriptUrl) return;

    let isMounted = true;
    const fetchRealtimeData = async () => {
      try {
        setIsSyncing(true);
        const res = await fetchFromGAS(settings.scriptUrl, { action: 'pull' });
        if (res.data && isMounted) {
          if (JSON.stringify(res.data) !== JSON.stringify(students)) {
            setStudents(res.data);
          }
        }
      } catch (e) {
        console.error("Auto sync failed:", e);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };

    fetchRealtimeData(); 
    const interval = setInterval(fetchRealtimeData, 30000); 
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, settings.scriptUrl, setStudents]);

  if (!isAuthenticated) {
    return <Login />;
  }

  const appName = settings.appName || 'EduConnect';

  const handleLogout = () => {
    if(window.confirm('Apakah Anda yakin ingin keluar?')) {
      setIsLoggingOut(true);
      setTimeout(() => {
        setIsLoggingOut(false);
        logout();
      }, 1000);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'students', label: 'Data Siswa', icon: Users },
    { id: 'mutasi', label: 'Mutasi Siswa', icon: FileOutput },
    { id: 'attendance', label: 'Cetak Daftar Hadir', icon: CalendarCheck },
    { id: 'kenaikan', label: 'Kenaikan Kelas', icon: TrendingUp },
    { id: 'settings', label: 'Pengaturan', icon: SettingsIcon },
  ] as const;

  return (
    <div className="h-screen w-full bg-gradient-to-br from-[#e0e7ff] via-[#f3e8ff] to-[#fce7f3] flex flex-col md:flex-row font-sans text-gray-800">
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-900 font-medium">Sedang keluar...</p>
        </div>
      )}
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-indigo-600/90 backdrop-blur-md text-white p-4 flex justify-between items-center no-print z-50">
        <h1 className="font-bold text-lg tracking-tight">{appName}</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white/90 md:bg-white/40 backdrop-blur-xl border-r border-white/20 p-6 flex flex-col transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 no-print flex-shrink-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="mb-10 hidden md:flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 flex-shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-indigo-900 truncate">{appName}</span>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto mt-6 md:mt-0 pr-2">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2 hidden md:block">Menu Utama</div>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 sm:px-4 sm:py-3 rounded-xl transition-all text-left font-medium",
                  activeTab === tab.id 
                    ? "bg-white/90 md:bg-white/60 text-indigo-700 shadow-sm border border-white/40" 
                    : "text-gray-600 hover:bg-white/60 md:hover:bg-white/40 border border-transparent"
                )}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/20">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left font-medium text-rose-600 hover:bg-rose-50 border border-transparent"
          >
            <LogOut size={20} />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 h-full">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'students' && <StudentsList />}
        {activeTab === 'mutasi' && <MutasiList />}
        {activeTab === 'attendance' && <AttendancePrint />}
        {activeTab === 'kenaikan' && <KenaikanKelas />}
        {activeTab === 'settings' && <Settings />}
      </div>
    </div>
  );
}

export default App;
