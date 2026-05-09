import { useStore } from '../store';
import { Users, GraduationCap, UserMinus, HardDriveUpload } from 'lucide-react';
import { fetchFromGAS } from '../lib/api';
import { useState } from 'react';

export default function Dashboard() {
  const { students, settings, setStudents, setLoading } = useStore();
  const [syncStatus, setSyncStatus] = useState('');

  const stats = [
    { label: 'Total Siswa', value: students.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'Siswa Aktif', value: students.filter(s => s.status === 'Aktif').length, icon: Users, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Siswa Lulus', value: students.filter(s => s.status === 'Lulus').length, icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'Keluar / Mutasi', value: students.filter(s => s.status === 'Keluar' || s.status === 'Pindah').length, icon: UserMinus, color: 'text-rose-500', bg: 'bg-rose-100' },
  ];

  const handleSyncToSheets = async () => {
    if (!settings.scriptUrl) {
      alert("Harap atur URL Google Apps Script di Pengaturan terlebih dahulu.");
      return;
    }
    try {
      setSyncStatus('Sinkronisasi...');
      setLoading(true);
      await fetchFromGAS(settings.scriptUrl, {
        action: 'sync',
        data: students
      });
      setSyncStatus('Berhasil disinkronkan ke Google Sheets!');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (e: any) {
      alert("Gagal: " + e.message);
      setSyncStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handlePullFromSheets = async () => {
    if (!settings.scriptUrl) {
      alert("Harap atur URL Google Apps Script di Pengaturan terlebih dahulu.");
      return;
    }
    try {
      setSyncStatus('Mengunduh data...');
      setLoading(true);
      const res = await fetchFromGAS(settings.scriptUrl, { action: 'pull' });
      if(res.data) {
        setStudents(res.data);
      }
      setSyncStatus('Berhasil mengambil data dari Google Sheets!');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (e: any) {
      alert("Gagal: " + e.message);
      setSyncStatus('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-indigo-900">Dashboard</h2>
        <p className="text-gray-500 mt-1 font-medium">Ringkasan data siswa SD Kelas 1-6.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white/60 backdrop-blur-md p-4 md:p-5 rounded-3xl border border-white/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 transition-all hover:bg-white/80">
              <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${s.bg} ${s.color} shadow-sm border border-white/60`}>
                <Icon size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl sm:text-3xl font-black text-indigo-900 mt-1">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white/70 backdrop-blur-2xl p-5 sm:p-8 rounded-3xl sm:rounded-[2rem] border border-white/90 shadow-lg mt-8 w-full overflow-hidden">
        <h3 className="text-xl font-bold mb-4 text-indigo-900">Integrasi Database Realtime</h3>
        <p className="text-gray-600 mb-6 w-full text-sm sm:text-base leading-relaxed">
          Aplikasi ini memprioritaskan penyimpanan lokal untuk kecepatan UI (PWA). 
          Agar terhubung dengan Google Sheets, pastikan Anda telah menekan tombol "Sinkronkan" 
          setelah menambah atau mengubah data siswa.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-4">
          <button onClick={handleSyncToSheets} className="btn">
            <HardDriveUpload size={18} />
            Push Data ke Google Sheets
          </button>
          <button onClick={handlePullFromSheets} className="btn-outline">
            Tarik Data dari Google Sheets
          </button>
        </div>
        {syncStatus && <p className="mt-3 text-sm text-blue-600 font-medium">{syncStatus}</p>}
      </div>
    </div>
  );
}
