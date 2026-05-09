import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Student } from '../types';
import { CLASSES, cn } from '../lib/utils';
import { Search, Filter, RefreshCw, Printer, X, FileOutput } from 'lucide-react';

export default function MutasiList() {
  const { students, updateStudent } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Get active students for selection
  const activeStudents = useMemo(() => students.filter(s => s.status === 'Aktif'), [students]);

  // Derived filtered data for Mutasi
  const mutasiStudents = students.filter(s => {
    const searchString = searchTerm.toLowerCase();
    const isMutasiOrKeluar = s.status === 'Pindah' || s.status === 'Keluar';
    if (!isMutasiOrKeluar) return false;

    const matchesSearch = s.name.toLowerCase().includes(searchString) || 
                          s.nis.toLowerCase().includes(searchString) ||
                          (s.nisn && s.nisn.toLowerCase().includes(searchString));
    const matchesClass = filterClass ? s.class === filterClass : true;
    return matchesSearch && matchesClass;
  });

  const handleOpenModal = () => {
    setSelectedStudentId('');
    setIsModalOpen(true);
  };

  const handleSaveMutasi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert('Pilih siswa terlebih dahulu!');
      return;
    }
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    // By default make it Pindah, the user can adjust later if needed or we could add a dropdown here
    const konfirmasi = window.confirm(`Apakah Anda yakin ingin memutasi/mengeluarkan siswa ${student.name}?`);
    if (konfirmasi) {
      updateStudent(selectedStudentId, { status: 'Pindah' });
      setIsModalOpen(false);
    }
  };

  const handleRestore = (id: string, name: string) => {
    if (window.confirm(`Kembalikan status ${name} menjadi Aktif?`)) {
      updateStudent(id, { status: 'Aktif' });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-indigo-900">Data Mutasi & Keluar</h2>
          <p className="text-gray-500 mt-1 font-medium">Manajemen siswa yang pindah atau keluar dari sekolah.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white/40 p-4 rounded-3xl border border-white/60 shadow-sm backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari berdasarkan Nama, NIS, atau NISN..." 
            className="w-full bg-white/60 backdrop-blur-lg border border-white/80 px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-12 font-medium text-gray-800 placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          <div className="relative shrink-0">
            <Filter className="absolute left-4 top-3.5 text-gray-400" size={18} />
            <select 
              className="bg-white/60 backdrop-blur-lg border border-white/80 px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-11 appearance-none font-medium text-gray-700 min-w-[120px]"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
            >
              <option value="">Semua Kelas</option>
              {CLASSES.map(c => <option key={c} value={c}>Kelas {c}</option>)}
            </select>
          </div>
          <button onClick={handleOpenModal} className="btn justify-center w-full sm:w-auto shrink-0 whitespace-nowrap">
            <FileOutput className="mr-2" size={18} /> Proses Mutasi Siswa
          </button>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-2xl rounded-[2rem] border border-white/90 shadow-lg overflow-hidden flex flex-col mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[700px]">
            <thead className="bg-white/90 backdrop-blur-sm z-10 sticky top-0">
              <tr className="text-gray-400 text-[11px] uppercase tracking-widest border-b border-gray-100">
                <th className="px-6 py-4 font-bold">NIS / NISN</th>
                <th className="px-6 py-4 font-bold">Nama Lengkap</th>
                <th className="px-6 py-4 font-bold">Kelas</th>
                <th className="px-6 py-4 font-bold">L/P</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/80">
              {mutasiStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-gray-100 p-4 rounded-full mb-3">
                        <Search className="text-gray-400 w-6 h-6" />
                      </div>
                      <p>Tidak ada data siswa mutasi/keluar yang ditemukan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                mutasiStudents.map(student => (
                  <tr key={student.id} className="hover:bg-white/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-gray-600">
                      <div>{student.nis}</div>
                      {student.nisn && <div className="text-xs text-gray-400">{student.nisn}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800">{student.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700">
                        {student.class}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-600">{student.gender}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                        student.status === 'Keluar' ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", 
                          student.status === 'Keluar' ? 'bg-rose-500' : 'bg-orange-500'
                        )}></span>
                        {student.status === 'Pindah' ? 'Mutasi' : student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleRestore(student.id, student.name)} className="px-2 sm:px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-semibold text-green-600 shadow-sm hover:bg-green-50 transition-colors">
                          <RefreshCw size={16} className="sm:hidden" />
                          <span className="hidden sm:inline">Kembalikan ke Aktif</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Mutasi */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl border border-white/50 shadow-2xl w-full max-w-lg mt-auto transition-transform">
             <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-white/50 rounded-t-3xl sm:rounded-t-3xl sticky top-0 z-10">
               <h3 className="text-xl font-bold text-indigo-900">Proses Mutasi Siswa</h3>
               <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 hover:text-indigo-600 transition">
                 <X size={20} />
               </button>
             </div>
             <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto relative">
                <form onSubmit={handleSaveMutasi} className="space-y-4">
                  <div>
                    <label className="label">Pilih Siswa Aktif</label>
                    <select 
                      className="input" 
                      required 
                      value={selectedStudentId} 
                      onChange={e => setSelectedStudentId(e.target.value)}
                    >
                      <option value="" disabled>-- Pilih Siswa --</option>
                      {activeStudents.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nis} - {c.name} (Kelas {c.class})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="pt-4 flex items-start gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100 mb-6">
                    <FileOutput className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-orange-800">
                      Siswa yang dipilih akan diubah statusnya menjadi <strong>Mutasi (Pindah)</strong> dan akan dipindahkan ke daftar mutasi.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 pb-4 sm:pt-6 sm:pb-0 sticky bottom-0 z-20 bg-white/95 sm:bg-transparent backdrop-blur-md p-4 sm:p-0 -mx-5 sm:mx-0 mt-4 border-t border-gray-100 sm:border-0">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">Batal</button>
                     <button type="submit" className="btn bg-orange-500 hover:bg-orange-600 shadow-orange-200">Proses Mutasi</button>
                  </div>
                </form>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
