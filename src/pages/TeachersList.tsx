import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { Teacher } from '../types';
import { 
  Search, Plus, Edit2, Trash2, X, Save, Filter, 
  GraduationCap, Phone, Mail, CheckCircle2, XCircle, Users,
  DownloadCloud, UploadCloud, FileSpreadsheet
} from 'lucide-react';
import { fetchFromGAS } from '../lib/api';
import { exportTeachersToExcel } from '../lib/excel';

export default function TeachersList() {
  const { teachers, settings, addTeacher, updateTeacher, deleteTeacher, setLoading, setIsSyncingGlobal } = useStore();
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Nonaktif'>('Semua');
  const [classFilter, setClassFilter] = useState('Semua');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  
  // Form state
  const [nip, setNip] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [assignedClass, setAssignedClass] = useState('None');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  
  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'nip' | 'class'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const csvInputRef = useRef<HTMLInputElement>(null);

  const downloadCSVTemplate = () => {
    const headers = ["NIP", "Nama Lengkap", "L/P", "Wali Kelas", "No Telepon", "Email", "Status (Aktif/Nonaktif)"];
    const rows = [
      ["198503122010121002", "Budi Santoso, S.Pd.", "L", "1A", "081234567890", "budi.santoso@sekolah.sch.id", "Aktif"],
      ["199008242015042003", "Siti Rahma, S.Pd.", "P", "None", "087654321098", "siti.rahma@sekolah.sch.id", "Aktif"]
    ];
    
    // Create CSV payload
    const csvRows = [headers.join(","), ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(","))];
    const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM for excel auto detection
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template_guru_sd.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          alert("File CSV kosong atau format salah.");
          return;
        }

        const newTeachers: Teacher[] = [];
        const now = new Date().toISOString();

        // Helper to parse line with proper quotes
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cells = parseCSVLine(line);
          if (cells.length < 2) continue; // Must at least have NIP/Name

          const nip = cells[0] || '';
          const name = cells[1] || '';
          if (!name) continue;

          const gender = (cells[2] || 'L').toUpperCase() === 'P' ? 'P' : 'L';
          const tClass = cells[3] || 'None';
          const phone = cells[4] || '';
          const email = cells[5] || '';
          
          const statusRaw = String(cells[6] || 'Aktif').trim();
          let parsedStatus: 'Aktif' | 'Nonaktif' = 'Aktif';
          if (statusRaw.toLowerCase().includes('non') || statusRaw.toLowerCase().includes('pasif') || statusRaw.toLowerCase().includes('tidak')) {
            parsedStatus = 'Nonaktif';
          }

          newTeachers.push({
            id: crypto.randomUUID(),
            nip,
            name,
            gender,
            class: tClass,
            phone,
            email,
            status: parsedStatus,
            createdAt: now,
            updatedAt: now,
          });
        }

        if (newTeachers.length === 0) {
          alert("Tidak ada data valid yang diimport.");
          return;
        }

        newTeachers.forEach(t => addTeacher(t));
        
        const currentTeachers = [...useStore.getState().teachers];
        await triggerSync(currentTeachers);
        
        alert(`Berhasil mengimpor ${newTeachers.length} data guru!`);
      } catch (err: any) {
        alert("Gagal mengimpor CSV: " + err.message);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // Sync to sheets immediately when data is changed
  const triggerSync = async (updatedTeachers: Teacher[]) => {
    if (!settings.scriptUrl) return;
    try {
      setLoading(true);
      setIsSyncingGlobal(true);
      await fetchFromGAS(settings.scriptUrl, {
        action: 'sync',
        data: useStore.getState().students,
        teachers: updatedTeachers
      });
    } catch (e) {
      console.error("Auto sync teachers failed:", e);
    } finally {
      setLoading(false);
      setIsSyncingGlobal(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTeacher(null);
    setNip('');
    setName('');
    setGender('L');
    setAssignedClass('None');
    setPhone('');
    setEmail('');
    setStatus('Aktif');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setNip(t.nip);
    setName(t.name);
    setGender(t.gender);
    setAssignedClass(t.class);
    setPhone(t.phone);
    setEmail(t.email);
    setStatus(t.status);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingTeacher) {
      const updated: Partial<Teacher> = {
        nip,
        name,
        gender,
        class: assignedClass,
        phone,
        email,
        status,
        updatedAt: new Date().toISOString()
      };
      updateTeacher(editingTeacher.id, updated);
      
      const currentTeachers = useStore.getState().teachers;
      await triggerSync(currentTeachers);
    } else {
      const newTeacher: Teacher = {
        id: crypto.randomUUID(),
        nip,
        name,
        gender,
        class: assignedClass,
        phone,
        email,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      addTeacher(newTeacher);
      
      const currentTeachers = useStore.getState().teachers;
      await triggerSync(currentTeachers);
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data guru "${name}"?`)) {
      const updated = teachers.filter(t => t.id !== id);
      deleteTeacher(id);
      await triggerSync(updated);
    }
  };

  // List of available classes (1A-6C + None)
  const classesList = useMemo(() => {
    const list = [];
    for (let g = 1; g <= 6; g++) {
      for (const c of ['A', 'B', 'C']) {
        list.push(`${g}${c}`);
      }
    }
    return list;
  }, []);

  // Filter & Search logic
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchesSearch = 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.nip.includes(searchTerm) || 
        (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'Semua' || t.status === statusFilter;
      const matchesClass = classFilter === 'Semua' || t.class === classFilter;
      
      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [teachers, searchTerm, statusFilter, classFilter]);

  // Sort logic
  const sortedTeachers = useMemo(() => {
    return [...filteredTeachers].sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      
      if (sortBy === 'class') {
        aVal = a.class === 'None' ? 'ZZZ' : a.class;
        bVal = b.class === 'None' ? 'ZZZ' : b.class;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTeachers, sortBy, sortOrder]);

  const toggleSort = (field: 'name' | 'nip' | 'class') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-indigo-900">Data Guru</h2>
          <p className="text-gray-500 mt-1 font-medium">Kelola data tenaga pengajar beserta penugasan kelas.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <input 
            type="file" 
            accept=".csv"
            className="hidden" 
            ref={csvInputRef}
            onChange={handleCSVImport}
          />
          <button 
            onClick={downloadCSVTemplate} 
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-100/50 font-medium text-sm transition active:scale-95 duration-150"
          >
            <DownloadCloud size={16} /> Template CSV
          </button>
          <button 
            onClick={() => csvInputRef.current?.click()} 
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-200/50 hover:bg-amber-600 font-medium text-sm transition active:scale-95 duration-150"
          >
            <UploadCloud size={16} /> Import CSV
          </button>
          <button 
            onClick={() => exportTeachersToExcel(filteredTeachers, `Daftar_Guru_${new Date().toISOString().slice(0, 10)}.xlsx`)} 
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200/50 hover:bg-emerald-700 font-medium text-sm transition active:scale-95 duration-150"
          >
            <FileSpreadsheet size={16} /> Export ke Excel
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="btn flex items-center justify-center w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 duration-150 text-sm"
          >
            <Plus size={16} />
            <span>Tambah Guru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-white/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Cari NIP, nama guru, atau email..." 
              className="input pl-11 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-indigo-500" />
            <select 
              className="input py-2.5"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-indigo-500" />
            <select 
              className="input py-2.5"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="Semua">Semua Kelas</option>
              <option value="None">Bukan Wali Kelas (Guru Mapel)</option>
              {classesList.map(c => (
                <option key={c} value={c}>Kelas {c}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Teachers List Card */}
      <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-white/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-indigo-100">
            <thead>
              <tr className="border-b border-indigo-100 bg-indigo-50/40 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                <th className="p-4 text-center w-12 border border-indigo-100">No</th>
                <th className="p-4 cursor-pointer hover:bg-indigo-50 transition border border-indigo-100" onClick={() => toggleSort('nip')}>
                  NIP {sortBy === 'nip' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-indigo-50 transition border border-indigo-100" onClick={() => toggleSort('name')}>
                  Nama Lengkap {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 border border-indigo-100">Jenis Kelamin</th>
                <th className="p-4 cursor-pointer hover:bg-indigo-50 transition border border-indigo-100" onClick={() => toggleSort('class')}>
                  Wali Kelas {sortBy === 'class' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 border border-indigo-100">Kontak</th>
                <th className="p-4 text-center border border-indigo-100">Status</th>
                <th className="p-4 text-center w-28 border border-indigo-100">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50 text-sm">
              {sortedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 font-medium border border-indigo-100">
                    Tidak ada data guru yang ditemukan
                  </td>
                </tr>
              ) : (
                sortedTeachers.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-white/40 transition">
                    <td className="p-4 text-center font-semibold text-gray-400 border border-indigo-100">{idx + 1}</td>
                    <td className="p-4 font-mono font-medium text-gray-600 border border-indigo-100">{t.nip || '-'}</td>
                    <td className="p-4 font-bold text-gray-900 border border-indigo-100">{t.name}</td>
                    <td className="p-4 text-gray-600 border border-indigo-100">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        {t.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                      </span>
                    </td>
                    <td className="p-4 border border-indigo-100">
                      {t.class === 'None' ? (
                        <span className="text-gray-400 italic text-xs">Guru Mapel / Lainnya</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                          Kelas {t.class}
                        </span>
                      )}
                    </td>
                    <td className="p-4 space-y-1 text-xs border border-indigo-100">
                      {t.phone && (
                        <div className="flex items-center gap-1 text-gray-600 font-medium">
                          <Phone size={12} className="text-indigo-400" />
                          <span>{t.phone}</span>
                        </div>
                      )}
                      {t.email && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Mail size={12} className="text-indigo-400" />
                          <span>{t.email}</span>
                        </div>
                      )}
                      {!t.phone && !t.email && <span className="text-gray-400">-</span>}
                    </td>
                    <td className="p-4 text-center border border-indigo-100">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        t.status === 'Aktif' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {t.status === 'Aktif' ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            <span>Nonaktif</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-center border border-indigo-100">
                      <div className="flex justify-center items-center gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(t)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id, t.name)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-6 h-6" />
                <h3 className="text-xl font-bold">{editingTeacher ? 'Edit Data Guru' : 'Tambah Guru Baru'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-full transition">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              
              {/* NIP */}
              <div>
                <label className="label">NIP (Nomor Induk Pegawai)</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Masukkan NIP (jika ada)" 
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                />
              </div>

              {/* Nama Guru */}
              <div>
                <label className="label">Nama Lengkap Guru <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  className="input font-bold" 
                  placeholder="Contoh: Budi Santoso, S.Pd." 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Jenis Kelamin & Wali Kelas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Jenis Kelamin</label>
                  <select 
                    className="input"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Penugasan Wali Kelas</label>
                  <select 
                    className="input font-bold"
                    value={assignedClass}
                    onChange={(e) => setAssignedClass(e.target.value)}
                  >
                    <option value="None">Bukan Wali Kelas (Guru Mapel)</option>
                    {classesList.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* No Telepon & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">No. Telepon / WhatsApp</label>
                  <input 
                    type="tel" 
                    className="input" 
                    placeholder="Contoh: 08123456789" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input 
                    type="email" 
                    className="input" 
                    placeholder="Contoh: budi@sekolah.sch.id" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="label">Status</label>
                <select 
                  className="input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-indigo-50">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 font-semibold transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition"
                >
                  <Save size={18} />
                  <span>Simpan</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
