import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { Teacher } from '../types';
import { 
  Search, Plus, Edit2, Trash2, X, Save, Filter, 
  GraduationCap, Phone, Mail, CheckCircle2, XCircle, Users,
  DownloadCloud, UploadCloud, FileSpreadsheet, RefreshCw, UserCheck, PlusCircle
} from 'lucide-react';
import { generateId, cn } from '../lib/utils';
import { fetchFromGAS } from '../lib/api';
import { exportTeachersToExcel, parseCSVToTeachers } from '../lib/excel';

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

  // Import Preview State
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    parsedData: Partial<Teacher>[];
  } | null>(null);
  const [importMode, setImportMode] = useState<'UPDATE' | 'SKIP_EXISTING' | 'ADD_ALL'>('UPDATE');
  const [isProcessingImport, setIsProcessingImport] = useState(false);

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

  const processTeacherImport = async (parsed: Partial<Teacher>[], mode: 'UPDATE' | 'SKIP_EXISTING' | 'ADD_ALL' = 'UPDATE') => {
    const now = new Date().toISOString();
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const currentTeachers = [...useStore.getState().teachers];

    for (const imp of parsed) {
      const impNip = imp.nip ? String(imp.nip).trim() : '';
      const impName = imp.name ? String(imp.name).trim().toLowerCase() : '';

      if (!impName && !impNip) continue;

      let existingIdx = -1;
      if (mode !== 'ADD_ALL') {
        existingIdx = currentTeachers.findIndex(e => {
          const eNip = e.nip ? String(e.nip).trim() : '';
          const eName = e.name ? String(e.name).trim().toLowerCase() : '';

          if (impNip && eNip && impNip === eNip) return true;
          if (impName && eName && impName === eName) return true;
          return false;
        });
      }

      if (existingIdx >= 0) {
        if (mode === 'SKIP_EXISTING') {
          skippedCount++;
          continue;
        }

        // UPDATE mode
        const existing = currentTeachers[existingIdx];
        const updated: Teacher = {
          ...existing,
          nip: impNip || existing.nip,
          name: imp.name?.trim() || existing.name,
          gender: imp.gender || existing.gender,
          class: imp.class || existing.class,
          phone: imp.phone || existing.phone,
          email: imp.email || existing.email,
          status: imp.status || existing.status,
          updatedAt: now,
        };
        currentTeachers[existingIdx] = updated;
        useStore.getState().updateTeacher(existing.id, updated);
        updatedCount++;
      } else {
        const newTeacher: Teacher = {
          id: generateId(),
          nip: impNip,
          name: imp.name?.trim() || 'Guru',
          gender: imp.gender || 'L',
          class: imp.class || 'None',
          phone: imp.phone || '',
          email: imp.email || '',
          status: imp.status || 'Aktif',
          createdAt: now,
          updatedAt: now,
        };
        currentTeachers.push(newTeacher);
        useStore.getState().addTeacher(newTeacher);
        addedCount++;
      }
    }

    const finalTeachers = useStore.getState().teachers;
    await triggerSync(finalTeachers);
    
    let msg = `Proses Import Guru Selesai!\n• ${addedCount} data baru ditambahkan\n• ${updatedCount} data lama diperbarui/ditimpa`;
    if (skippedCount > 0) {
      msg += `\n• ${skippedCount} data diabaikan (sudah ada)`;
    }
    alert(msg);
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsProcessingImport(true);
    try {
      await processTeacherImport(importPreview.parsedData, importMode);
      setImportPreview(null);
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan saat memproses import: " + (err?.message || err));
    } finally {
      setIsProcessingImport(false);
    }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSVToTeachers(text);
        if (parsed.length === 0) {
          alert("Tidak ada data valid yang diimport.");
          return;
        }

        setImportPreview({
          fileName: file.name,
          parsedData: parsed
        });
        setImportMode('UPDATE');
      } catch (err: any) {
        console.error(err);
        alert("Gagal mengimpor file CSV: " + (err?.message || err));
      }
    };
    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = '';
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

      {/* Modal Selection Import CSV Guru */}
      {importPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl">
                  <UploadCloud className="text-amber-300" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Menu Import Data Guru</h3>
                  <p className="text-xs text-indigo-200 flex items-center gap-1.5 mt-0.5">
                    <span>📄 {importPreview.fileName}</span>
                    <span>•</span>
                    <span className="font-semibold text-amber-300">{importPreview.parsedData.length} data terdeteksi</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setImportPreview(null)}
                className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Preview Table */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Pratinjau Data File (3 Baris Pertama)
                </label>
                <div className="border border-gray-200 rounded-xl overflow-hidden text-xs bg-gray-50">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="p-2">NIP</th>
                        <th className="p-2">Nama</th>
                        <th className="p-2">Wali Kelas</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {importPreview.parsedData.slice(0, 3).map((t, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-2 font-mono text-gray-600">{t.nip || '-'}</td>
                          <td className="p-2 font-medium text-gray-800">{t.name || '-'}</td>
                          <td className="p-2 text-gray-600">{t.class || 'None'}</td>
                          <td className="p-2 text-gray-600">{t.status || 'Aktif'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5 block">
                  Pilih Cara Pengolahan Data
                </label>
                <div className="space-y-3">
                  {/* Option 1: Update Existing & Add New */}
                  <label 
                    className={cn(
                      "flex items-start gap-3.5 p-3.5 rounded-xl border-2 transition cursor-pointer",
                      importMode === 'UPDATE' 
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm" 
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="importModeGuru" 
                      value="UPDATE" 
                      checked={importMode === 'UPDATE'}
                      onChange={() => setImportMode('UPDATE')}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <RefreshCw size={16} className="text-indigo-600" />
                        <span className="font-semibold text-sm text-gray-900">Perbarui Data Lama & Tambah Data Baru</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Rekomendasi</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Jika guru sudah ada (cocok NIP / Nama), data lama akan diperbarui/ditimpa. Guru yang belum ada akan ditambahkan.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Skip Existing */}
                  <label 
                    className={cn(
                      "flex items-start gap-3.5 p-3.5 rounded-xl border-2 transition cursor-pointer",
                      importMode === 'SKIP_EXISTING' 
                        ? "border-amber-600 bg-amber-50/50 shadow-sm" 
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="importModeGuru" 
                      value="SKIP_EXISTING" 
                      checked={importMode === 'SKIP_EXISTING'}
                      onChange={() => setImportMode('SKIP_EXISTING')}
                      className="mt-1 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <UserCheck size={16} className="text-amber-600" />
                        <span className="font-semibold text-sm text-gray-900">Hanya Tambah Data Baru (Abaikan jika Sudah Ada)</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Jika guru sudah ada di sistem, datanya tidak disentuh/tidak ditimpa. Hanya guru baru yang dimasukkan.
                      </p>
                    </div>
                  </label>

                  {/* Option 3: Add All */}
                  <label 
                    className={cn(
                      "flex items-start gap-3.5 p-3.5 rounded-xl border-2 transition cursor-pointer",
                      importMode === 'ADD_ALL' 
                        ? "border-emerald-600 bg-emerald-50/50 shadow-sm" 
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="importModeGuru" 
                      value="ADD_ALL" 
                      checked={importMode === 'ADD_ALL'}
                      onChange={() => setImportMode('ADD_ALL')}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <PlusCircle size={16} className="text-emerald-600" />
                        <span className="font-semibold text-sm text-gray-900">Tambah Semua Sebagai Data Baru</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Abaikan pengecekan duplikasi. Seluruh {importPreview.parsedData.length} baris di file akan dibuat sebagai entri baru.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setImportPreview(null)}
                disabled={isProcessingImport}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isProcessingImport}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-200 transition disabled:opacity-50"
              >
                {isProcessingImport ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    Proses Import ({importPreview.parsedData.length} Data)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
