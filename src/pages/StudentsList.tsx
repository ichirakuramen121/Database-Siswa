import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { Student } from '../types';
import { CLASSES, STATUSES, generateId, cn } from '../lib/utils';
import { 
  Search, Plus, Filter, Download, Upload, Edit, Trash2, Printer, X
} from 'lucide-react';
import { exportToExcel, importFromExcel } from '../lib/excel';
import { uploadFileToGAS } from '../lib/api';

export default function StudentsList() {
  const { students, addStudent, updateStudent, deleteStudent, settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
  const [printStudent, setPrintStudent] = useState<Student | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived filtered data
  const filteredStudents = students.filter(s => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(searchString) || 
                          s.nis.toLowerCase().includes(searchString) ||
                          (s.nisn && s.nisn.toLowerCase().includes(searchString));
    const matchesClass = filterClass ? s.class === filterClass : true;
    return matchesSearch && matchesClass;
  });

  const handleOpenModal = (student?: Student) => {
    setCurrentStudent(student ? { ...student } : { gender: 'L', status: 'Aktif', class: '1A' });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent.name || !currentStudent.nis) return alert("Nama dan NIS Wajib diisi");
    
    const now = new Date().toISOString();
    
    if (currentStudent.id) {
      updateStudent(currentStudent.id, { ...currentStudent as Student, updatedAt: now });
    } else {
      addStudent({
        ...currentStudent as Student,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      });
    }
    setIsModalOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'berkas' | 'ijazah') => {
    if (!settings.scriptUrl) {
      alert("Atur Google Apps Script URL di pengaturan untuk mengaktifkan upload Drive.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFileToGAS(settings.scriptUrl, file, settings.folderId, "SISWA_UPLOADS");
      if (type === 'berkas') setCurrentStudent(prev => ({ ...prev, berkasUrl: url }));
      if (type === 'ijazah') setCurrentStudent(prev => ({ ...prev, ijazahUrl: url }));
      alert("Berkas berhasil diupload!");
    } catch (err: any) {
      alert("Gagal upload: " + err.message);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const newStudents = await importFromExcel(file);
      const now = new Date().toISOString();
      newStudents.forEach(s => {
        addStudent({
          ...s,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        } as Student);
      });
      alert(`Berhasil mengimport ${newStudents.length} siswa`);
    } catch (err) {
      alert("Gagal import");
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-indigo-900">Data Siswa</h2>
          <p className="text-gray-500 mt-1 font-medium">Kelola data murid kelas 1-6.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <input 
            type="file" 
            accept=".xlsx, .xls"
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl shadow-lg shadow-green-200/50 hover:bg-green-700 font-medium">
            <Upload size={18} /> Import Excel
          </button>
          <button onClick={() => exportToExcel(filteredStudents)} className="btn-outline justify-center w-full sm:w-auto">
            <Download size={18} /> Export
          </button>
          <button onClick={() => handleOpenModal()} className="btn justify-center w-full sm:w-auto">
            <Plus size={18} /> Tambah Siswa
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-2">
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
        <div className="relative w-full sm:w-48">
          <Filter className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <select 
            className="w-full bg-white/60 backdrop-blur-lg border border-white/80 px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-12 appearance-none font-medium text-gray-800"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="">Semua Kelas</option>
            {CLASSES.map(c => <option key={c} value={c}>Kelas {c}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-2xl rounded-[2rem] border border-white/90 shadow-lg overflow-hidden flex flex-col mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[700px]">
            <thead className="bg-white/90 backdrop-blur-sm z-10 sticky top-0">
              <tr className="text-gray-400 text-[11px] uppercase tracking-widest border-b border-gray-100">
                <th className="px-6 py-4 font-bold">NIS</th>
                <th className="px-6 py-4 font-bold">Nama Lengkap</th>
                <th className="px-4 py-4 font-bold text-center">Kelas</th>
                <th className="px-4 py-4 font-bold text-center">L/P</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-medium tracking-wide">
                    Tidak ada data siswa.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-white/40 transition-colors group">
                    <td className="px-6 py-4 font-mono text-gray-500">{student.nis}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{student.name}</td>
                    <td className="px-4 py-4 text-center">
                       <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black">{student.class}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                       <span className="text-gray-600 font-bold">{student.gender}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                        student.status === 'Aktif' ? 'bg-green-100 text-green-700' :
                        student.status === 'Lulus' ? 'bg-indigo-100 text-indigo-700' : 
                        student.status === 'Keluar' ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", 
                          student.status === 'Aktif' ? 'bg-green-500' :
                          student.status === 'Lulus' ? 'bg-indigo-500' : 
                          student.status === 'Keluar' ? 'bg-rose-500' : 'bg-orange-500'
                        )}></span>
                        {student.status === 'Pindah' ? 'Mutasi' : student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setPrintStudent(student)} className="px-2 sm:px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-semibold text-gray-600 shadow-sm hover:border-indigo-300 transition-colors">
                          <Printer size={16} className="sm:hidden" />
                          <span className="hidden sm:inline">Cetak</span>
                        </button>
                        <button onClick={() => handleOpenModal(student)} className="px-2 sm:px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors">
                          <Edit size={16} className="sm:hidden" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button onClick={() => {
                          if(confirm('Yakin ingin menghapus?')) deleteStudent(student.id);
                        }} className="px-2 sm:px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-semibold text-rose-600 shadow-sm hover:bg-rose-50 transition-colors">
                          <Trash2 size={16} className="sm:hidden" />
                          <span className="hidden sm:inline">Hapus</span>
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

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl border border-white/50 shadow-2xl w-full max-w-2xl mt-auto transition-transform">
             <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-white/50 rounded-t-3xl sm:rounded-t-3xl sticky top-0 z-10">
               <h3 className="text-xl font-bold text-indigo-900">{currentStudent.id ? 'Edit Siswa' : 'Tambah Siswa'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 hover:text-indigo-600 transition">
                 <X size={20} />
               </button>
             </div>
             <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto relative">
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">NIS</label>
                      <input type="text" className="input" required value={currentStudent.nis || ''} onChange={e => setCurrentStudent({...currentStudent, nis: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">NISN (Opsional)</label>
                      <input type="text" className="input" value={currentStudent.nisn || ''} onChange={e => setCurrentStudent({...currentStudent, nisn: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">Nama Lengkap</label>
                      <input type="text" className="input" required value={currentStudent.name || ''} onChange={e => setCurrentStudent({...currentStudent, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">Kelas</label>
                      <select className="input" value={currentStudent.class || '1A'} onChange={e => setCurrentStudent({...currentStudent, class: e.target.value})}>
                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Jenis Kelamin</label>
                      <select className="input" value={currentStudent.gender || 'L'} onChange={e => setCurrentStudent({...currentStudent, gender: e.target.value as 'L'|'P'})}>
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Tanggal Lahir</label>
                      <input type="date" className="input" value={currentStudent.dob || ''} onChange={e => setCurrentStudent({...currentStudent, dob: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">Nama Orang Tua</label>
                      <input type="text" className="input" value={currentStudent.parentName || ''} onChange={e => setCurrentStudent({...currentStudent, parentName: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                       <label className="label">Alamat</label>
                       <textarea className="input" rows={2} value={currentStudent.address || ''} onChange={e => setCurrentStudent({...currentStudent, address: e.target.value})}></textarea>
                    </div>
                    <div>
                      <label className="label">Status Siswa</label>
                      <select className="input" value={currentStudent.status || 'Aktif'} onChange={e => setCurrentStudent({...currentStudent, status: e.target.value as any})}>
                        <option value="Aktif">Aktif</option>
                        <option value="Lulus">Lulus</option>
                        <option value="Pindah">Mutasi / Pindah</option>
                        <option value="Keluar">Keluar</option>
                      </select>
                    </div>
                    
                    {currentStudent.status === 'Lulus' && (
                       <div>
                         <label className="label">Nomor Ijazah</label>
                         <input type="text" className="input" value={currentStudent.ijazahNo || ''} onChange={e => setCurrentStudent({...currentStudent, ijazahNo: e.target.value})} />
                       </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                    <div>
                       <label className="label">Upload Berkas Siswa</label>
                       <div className="flex gap-2">
                          <input type="file" className="text-sm" onChange={e => handleFileUpload(e, 'berkas')} />
                       </div>
                       {currentStudent.berkasUrl && <a href={currentStudent.berkasUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-block mt-1">Lihat Berkas Saat Ini</a>}
                    </div>
                    {currentStudent.status === 'Lulus' && (
                       <div>
                         <label className="label">Upload File Ijazah</label>
                         <div className="flex gap-2">
                            <input type="file" className="text-sm" onChange={e => handleFileUpload(e, 'ijazah')} />
                         </div>
                         {currentStudent.ijazahUrl && <a href={currentStudent.ijazahUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-block mt-1">Lihat Ijazah Saat Ini</a>}
                       </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 pb-4 sm:pt-6 sm:pb-0 sticky bottom-0 z-20 bg-white/95 sm:bg-transparent backdrop-blur-md p-4 sm:p-0 -mx-5 sm:mx-0 mt-4 border-t border-gray-100 sm:border-0">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">Batal</button>
                     <button type="submit" className="btn">Simpan Data</button>
                  </div>
                </form>
             </div>
          </div>
        </div>
      )}

      {/* Print View */}
      {printStudent && (
        <div id="printable-area" className="bg-white p-8 max-w-2xl mx-auto fixed inset-0 overflow-y-auto z-[200]">
           <div className="flex justify-between items-start no-print mb-8">
              <button onClick={() => window.print()} className="btn">Cetak Sekarang</button>
              <button onClick={() => setPrintStudent(null)} className="btn-outline"><X size={18} /> Tutup</button>
           </div>
           
           <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
              <h1 className="text-2xl font-bold uppercase">Biodata Siswa</h1>
              <p className="text-slate-600">Sekolah Dasar</p>
           </div>
           
           <table className="w-full text-left text-lg">
             <tbody>
               <tr><td className="py-2 w-1/3 font-semibold">NIS / NISN</td><td className="py-2">: {printStudent.nis} {printStudent.nisn ? `/ ${printStudent.nisn}` : ''}</td></tr>
               <tr><td className="py-2 font-semibold">Nama Lengkap</td><td className="py-2">: {printStudent.name}</td></tr>
               <tr><td className="py-2 font-semibold">Kelas</td><td className="py-2">: {printStudent.class}</td></tr>
               <tr><td className="py-2 font-semibold">Jenis Kelamin</td><td className="py-2">: {printStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
               <tr><td className="py-2 font-semibold">Tanggal Lahir</td><td className="py-2">: {printStudent.dob}</td></tr>
               <tr><td className="py-2 font-semibold">Nama Orang Tua</td><td className="py-2">: {printStudent.parentName}</td></tr>
               <tr><td className="py-2 font-semibold align-top">Alamat</td><td className="py-2">: {printStudent.address}</td></tr>
               <tr><td className="py-2 font-semibold">Status</td><td className="py-2">: {printStudent.status}</td></tr>
               {printStudent.status === 'Lulus' && (
                  <tr><td className="py-2 font-semibold">Nomor Ijazah</td><td className="py-2">: {printStudent.ijazahNo || '-'}</td></tr>
               )}
             </tbody>
           </table>
           
           <div className="mt-16 text-right">
              <p className="mb-16">.................., {new Date().toLocaleDateString('id-ID')}</p>
              <p className="font-semibold">( Administrasi Sekolah )</p>
           </div>
        </div>
      )}
    </div>
  );
}
