import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { Student } from '../types';
import { CLASSES, STATUSES, generateId, cn } from '../lib/utils';
import { 
  Search, Plus, Filter, Download, Upload, Edit, Trash2, Printer, X, FileDown,
  ArrowUpDown, FileSpreadsheet, Eye, BookOpen, User, Calendar, MapPin, UserCheck, DownloadCloud, UploadCloud
} from 'lucide-react';
import { exportToExcel, importFromExcel } from '../lib/excel';
import { uploadFileToGAS } from '../lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function StudentsList() {
  const { students, addStudent, updateStudent, deleteStudent, settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'name-desc' | 'class-asc' | 'class-desc'>('default');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [printStudent, setPrintStudent] = useState<Student | null>(null);
  const [isPrintListMode, setIsPrintListMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Derived filtered & sorted data
  const filteredStudents = students.filter(s => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(searchString) || 
                          s.nis.toLowerCase().includes(searchString) ||
                          (s.nisn && s.nisn.toLowerCase().includes(searchString));
    const matchesClass = filterClass ? s.class === filterClass : true;
    return matchesSearch && matchesClass;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === 'name-asc') {
      return a.name.localeCompare(b.name, 'id');
    }
    if (sortBy === 'name-desc') {
      return b.name.localeCompare(a.name, 'id');
    }
    if (sortBy === 'class-asc') {
      return a.class.localeCompare(b.class);
    }
    if (sortBy === 'class-desc') {
      return b.class.localeCompare(a.class);
    }
    return 0; // default
  });

  const downloadCSVTemplate = () => {
    const headers = ["NIS", "NISN", "Nama Lengkap", "Kelas", "L/P", "Tgl Lahir (YYYY-MM-DD)", "Alamat", "Nama Orang Tua", "Status (Aktif/Lulus/Pindah/Keluar)"];
    const rows = [
      ["252601001", "1234567890", "Ahmad Fauzi", "1A", "L", "2015-05-12", "Jl. Merdeka No. 10", "Slamet", "Aktif"],
      ["252601002", "0987654321", "Siti Aminah", "1A", "P", "2015-08-22", "Jl. Kenanga No. 4", "Budi", "Aktif"]
    ];
    
    // Create CSV payload
    const csvRows = [headers.join(","), ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(","))];
    const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM for excel auto detection
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template_siswa_sd.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          alert("File CSV kosong atau format salah.");
          return;
        }

        const newStudents: Student[] = [];
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
          if (cells.length < 3) continue; // Must at least have NIS, Name

          const nis = cells[0] || '';
          const nisn = cells[1] || '';
          const name = cells[2] || '';
          const sClass = cells[3] || '1A';
          const gender = (cells[4] || 'L').toUpperCase() === 'P' ? 'P' : 'L';
          const dob = cells[5] || '';
          const address = cells[6] || '';
          const parentName = cells[7] || '';
          
          const statusRaw = String(cells[8] || 'Aktif').trim();
          let parsedStatus: 'Aktif' | 'Lulus' | 'Pindah' | 'Keluar' = 'Aktif';
          if (statusRaw.toLowerCase().includes('lulus')) parsedStatus = 'Lulus';
          else if (statusRaw.toLowerCase().includes('pindah') || statusRaw.toLowerCase().includes('mutasi')) parsedStatus = 'Pindah';
          else if (statusRaw.toLowerCase().includes('keluar')) parsedStatus = 'Keluar';

          newStudents.push({
            id: generateId(),
            nis,
            nisn,
            name,
            class: sClass,
            gender,
            dob,
            address,
            parentName,
            status: parsedStatus,
            createdAt: now,
            updatedAt: now,
          });
        }

        if (newStudents.length === 0) {
          alert("Tidak ada data valid yang diimport.");
          return;
        }

        newStudents.forEach(s => addStudent(s));
        alert(`Berhasil mengimpor ${newStudents.length} siswa dari CSV!`);
      } catch (err) {
        console.error(err);
        alert("Gagal mengimpor file CSV.");
      }
    };
    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const title = `Daftar Siswa SD - ${filterClass ? 'Kelas ' + filterClass : 'Semua Kelas'}`;
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, 14, 18);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 25);

    const tableData = filteredStudents.map((s, idx) => [
      idx + 1,
      s.nis,
      s.nisn || '-',
      s.name,
      s.class,
      s.gender,
      s.status === 'Pindah' ? 'Mutasi' : s.status
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['No', 'NIS', 'NISN', 'Nama Lengkap', 'Kelas', 'L/P', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' }
      }
    });

    doc.save(`Daftar_Siswa_${filterClass || 'Semua'}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'kk' | 'akte' | 'foto') => {
    if (!settings.scriptUrl) {
      alert("Atur Google Apps Script URL di pengaturan untuk mengaktifkan upload Drive.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFileToGAS(settings.scriptUrl, file, settings.folderId, "SISWA_UPLOADS");
      if (type === 'kk') setCurrentStudent(prev => ({ ...prev, kkUrl: url }));
      if (type === 'akte') setCurrentStudent(prev => ({ ...prev, akteUrl: url }));
      if (type === 'foto') setCurrentStudent(prev => ({ ...prev, fotoUrl: url }));
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
          <input 
            type="file" 
            accept=".csv"
            className="hidden" 
            ref={csvInputRef}
            onChange={handleCSVImport}
          />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl shadow-lg shadow-green-200/50 hover:bg-green-700 font-medium text-sm">
            <Upload size={16} /> Import Excel
          </button>
          <button onClick={downloadCSVTemplate} className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-100/50 font-medium text-sm">
            <DownloadCloud size={16} /> Template CSV
          </button>
          <button onClick={() => csvInputRef.current?.click()} className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-200/50 hover:bg-amber-600 font-medium text-sm">
            <UploadCloud size={16} /> Import CSV
          </button>
          <button onClick={() => exportToExcel(filteredStudents)} className="btn-outline justify-center w-full sm:w-auto text-sm">
            <Download size={16} /> Export
          </button>
          <button onClick={() => downloadPDF()} className="btn-outline justify-center w-full sm:w-auto gap-2 text-indigo-600 border-indigo-100 hover:bg-indigo-50/50 text-sm">
            <FileDown size={16} /> Download PDF
          </button>
          <button onClick={() => setIsPrintListMode(true)} className="btn-outline justify-center w-full sm:w-auto text-sm">
            <Printer size={16} /> Cetak
          </button>
          <button onClick={() => handleOpenModal()} className="btn justify-center w-full sm:w-auto text-sm">
            <Plus size={16} /> Tambah Siswa
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
        <div className="relative w-full sm:w-56">
          <ArrowUpDown className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <select 
            className="w-full bg-white/60 backdrop-blur-lg border border-white/80 px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-12 appearance-none font-medium text-gray-800"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="default">Urutkan: Default</option>
            <option value="name-asc">Urutkan: Nama (A - Z)</option>
            <option value="name-desc">Urutkan: Nama (Z - A)</option>
            <option value="class-asc">Urutkan: Kelas (Terendah)</option>
            <option value="class-desc">Urutkan: Kelas (Tertinggi)</option>
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
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-medium tracking-wide">
                    Tidak ada data siswa.
                  </td>
                </tr>
              ) : (
                sortedStudents.map(student => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('.action-btn')) return;
                      setViewingStudent(student);
                    }}
                  >
                    <td className="px-6 py-4 font-mono text-gray-500">{student.nis}</td>
                    <td className="px-6 py-4 font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{student.name}</td>
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
                      <div className="action-btn flex justify-end gap-2">
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

      {/* Detail Siswa Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl border border-white/50 shadow-2xl w-full max-w-2xl mt-auto transition-transform overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-900 text-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Profil Lengkap Siswa</h3>
                  <p className="text-xs text-indigo-200">Informasi detail murid</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingStudent(null)} 
                className="p-2 bg-white/10 hover:bg-white/25 text-white rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
              {/* Profile card / top summary */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/30">
                {/* Photo / Avatar */}
                <div className="w-24 h-32 rounded-xl border border-slate-200 bg-white shadow-inner flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                  {viewingStudent.fotoUrl ? (
                    <img 
                      src={viewingStudent.fotoUrl.replace(/\/file\/d\/(.+?)\/view.*/, '/uc?export=view&id=$1')} 
                      alt="Foto" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-3xl font-black text-indigo-300">{viewingStudent.name ? viewingStudent.name[0] : 'S'}</span>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <h4 className="text-2xl font-extrabold text-indigo-900 leading-tight">{viewingStudent.name}</h4>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">Kelas {viewingStudent.class}</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{viewingStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold",
                      viewingStudent.status === 'Aktif' ? 'bg-green-100 text-green-700' :
                      viewingStudent.status === 'Lulus' ? 'bg-indigo-100 text-indigo-700' :
                      viewingStudent.status === 'Keluar' ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'
                    )}>{viewingStudent.status}</span>
                  </div>
                  <p className="text-sm font-mono text-gray-500">NIS: {viewingStudent.nis} {viewingStudent.nisn ? `| NISN: ${viewingStudent.nisn}` : ''}</p>
                </div>
              </div>

              {/* Bento Grid Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Detail 1 */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-3">
                  <Calendar size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Lahir</span>
                    <span className="text-sm font-semibold text-gray-800">{viewingStudent.dob || '-'}</span>
                  </div>
                </div>

                {/* Detail 2 */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-3">
                  <UserCheck size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Orang Tua</span>
                    <span className="text-sm font-semibold text-gray-800">{viewingStudent.parentName || '-'}</span>
                  </div>
                </div>

                {/* Detail 3 */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-3 sm:col-span-2">
                  <MapPin size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alamat Tinggal</span>
                    <span className="text-sm font-semibold text-gray-800">{viewingStudent.address || '-'}</span>
                  </div>
                </div>

                {viewingStudent.status === 'Lulus' && (
                  <div className="p-4 rounded-xl border border-slate-100 bg-indigo-50/20 flex gap-3 sm:col-span-2">
                    <BookOpen size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Nomor Ijazah</span>
                      <span className="text-sm font-bold text-indigo-900">{viewingStudent.ijazahNo || '-'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Attachments & Files */}
              <div className="space-y-3">
                <h5 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">Dokumen & Berkas</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* KK */}
                  <div className="p-3 rounded-xl border border-slate-100 flex flex-col justify-between gap-2 bg-white">
                    <span className="text-xs font-bold text-gray-500">Kartu Keluarga (KK)</span>
                    {viewingStudent.kkUrl ? (
                      <a href={viewingStudent.kkUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                        <Eye size={12} /> Lihat KK
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium italic">Tidak ada berkas</span>
                    )}
                  </div>

                  {/* Akte */}
                  <div className="p-3 rounded-xl border border-slate-100 flex flex-col justify-between gap-2 bg-white">
                    <span className="text-xs font-bold text-gray-500">Akte Kelahiran</span>
                    {viewingStudent.akteUrl ? (
                      <a href={viewingStudent.akteUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                        <Eye size={12} /> Lihat Akte
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium italic">Tidak ada berkas</span>
                    )}
                  </div>

                  {/* Berkas Lain */}
                  <div className="p-3 rounded-xl border border-slate-100 flex flex-col justify-between gap-2 bg-white">
                    <span className="text-xs font-bold text-gray-500">Berkas Pendukung</span>
                    {viewingStudent.berkasUrl ? (
                      <a href={viewingStudent.berkasUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                        <Eye size={12} /> Lihat Berkas
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium italic">Tidak ada berkas</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with actions */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-slate-50 flex flex-wrap justify-end gap-2 sticky bottom-0 z-20">
              <button 
                onClick={() => {
                  setViewingStudent(null);
                  setPrintStudent(viewingStudent);
                }} 
                className="btn-outline text-sm"
              >
                <Printer size={16} /> Cetak Biodata
              </button>
              <button 
                onClick={() => {
                  setViewingStudent(null);
                  handleOpenModal(viewingStudent);
                }} 
                className="btn-outline text-indigo-600 border-indigo-100 hover:bg-indigo-50/50 text-sm"
              >
                <Edit size={16} /> Edit Profil
              </button>
              <button 
                onClick={() => setViewingStudent(null)} 
                className="btn text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
                    <div>
                       <label className="label">Upload KK (Opsional)</label>
                       <div className="flex gap-2">
                          <input type="file" className="text-sm" onChange={e => handleFileUpload(e, 'kk')} />
                       </div>
                       {currentStudent.kkUrl && <a href={currentStudent.kkUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-block mt-1">Lihat KK Saat Ini</a>}
                    </div>
                    <div>
                       <label className="label">Upload Akte (Opsional)</label>
                       <div className="flex gap-2">
                          <input type="file" className="text-sm" onChange={e => handleFileUpload(e, 'akte')} />
                       </div>
                       {currentStudent.akteUrl && <a href={currentStudent.akteUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-block mt-1">Lihat Akte Saat Ini</a>}
                    </div>
                    <div>
                         <label className="label">Upload Foto (Opsional)</label>
                         <div className="flex gap-2">
                            <input type="file" accept="image/*" className="text-sm" onChange={e => handleFileUpload(e, 'foto')} />
                         </div>
                         {currentStudent.fotoUrl && <a href={currentStudent.fotoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-block mt-1">Lihat Foto Saat Ini</a>}
                    </div>
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
        <div id="printable-area" className="bg-white p-8 max-w-2xl mx-auto fixed inset-0 overflow-y-auto print:overflow-visible print:relative print:inset-auto print:p-0 z-[200]">
           <div className="flex justify-between items-start no-print mb-8">
              <button onClick={() => window.print()} className="btn">Cetak Sekarang</button>
              <button onClick={() => setPrintStudent(null)} className="btn-outline"><X size={18} /> Tutup</button>
           </div>
           
           <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
              <h1 className="text-2xl font-bold uppercase">Biodata Siswa</h1>
              <p className="text-slate-600">Sekolah Dasar</p>
           </div>
           
           <div className="flex flex-row justify-between items-start gap-8 mb-8">
              <table className="w-full text-left text-base sm:text-lg flex-1">
                <tbody>
                  <tr><td className="py-1 sm:py-2 w-1/3 md:w-1/4 font-semibold">NIS / NISN</td><td className="py-1 sm:py-2">: {printStudent.nis} {printStudent.nisn ? `/ ${printStudent.nisn}` : ''}</td></tr>
                  <tr><td className="py-1 sm:py-2 font-semibold">Nama Lengkap</td><td className="py-1 sm:py-2">: {printStudent.name}</td></tr>
                  <tr><td className="py-1 sm:py-2 font-semibold">Kelas</td><td className="py-1 sm:py-2">: {printStudent.class}</td></tr>
                  <tr><td className="py-1 sm:py-2 font-semibold">Jenis Kelamin</td><td className="py-1 sm:py-2">: {printStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
                  <tr><td className="py-1 sm:py-2 font-semibold">Tanggal Lahir</td><td className="py-1 sm:py-2">: {printStudent.dob}</td></tr>
                  <tr><td className="py-1 sm:py-2 font-semibold">Nama Orang Tua</td><td className="py-1 sm:py-2">: {printStudent.parentName}</td></tr>
                  <tr><td className="py-1 sm:py-2 font-semibold align-top">Alamat</td><td className="py-1 sm:py-2">: {printStudent.address}</td></tr>
                  <tr><td className="py-1 sm:py-2 font-semibold">Status</td><td className="py-1 sm:py-2">: {printStudent.status}</td></tr>
                  {printStudent.status === 'Lulus' && (
                     <tr><td className="py-1 sm:py-2 font-semibold">Nomor Ijazah</td><td className="py-1 sm:py-2">: {printStudent.ijazahNo || '-'}</td></tr>
                  )}
                </tbody>
              </table>

              {printStudent.fotoUrl && (
                 <div className="w-[3cm] h-[4cm] sm:w-[4cm] sm:h-[6cm] shrink-0 border-2 border-slate-800 p-1 bg-white relative flex items-center justify-center text-center overflow-hidden no-print-bg">
                    <img 
                      src={printStudent.fotoUrl.replace(/\/file\/d\/(.+?)\/view.*/, '/uc?export=view&id=$1')} 
                      alt="Foto Siswa" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        if (!(e.target as HTMLImageElement).parentElement?.querySelector('.error-text')) {
                          const span = document.createElement('span');
                          span.className = "error-text text-[10px] text-gray-500 absolute inline-block p-1";
                          span.innerText = "Foto tidak dapat ditampilkan (Mungkin Folder Google Drive belum di set Publik)";
                          (e.target as HTMLImageElement).parentElement?.appendChild(span);
                        }
                      }}
                    />
                 </div>
              )}
           </div>
           
           <div className="mt-16 text-right">
              <p className="mb-16">.................., {new Date().toLocaleDateString('id-ID')}</p>
              <p className="font-semibold">( Administrasi Sekolah )</p>
           </div>
        </div>
      )}

      {/* Print ListView */}
      {isPrintListMode && (
        <div id="printable-area" className="bg-white p-8 max-w-5xl mx-auto fixed inset-0 overflow-y-auto print:overflow-visible print:relative print:inset-auto print:p-0 z-[200]">
           <div className="flex justify-between items-start no-print mb-8">
              <button onClick={() => window.print()} className="btn">Cetak Sekarang</button>
              <button onClick={() => setIsPrintListMode(false)} className="btn-outline"><X size={18} /> Tutup</button>
           </div>
           
           <div className="text-center mb-6">
              <h1 className="text-2xl font-bold uppercase">DAFTAR SISWA SD</h1>
              <p className="text-slate-600">
                {filterClass ? `KELAS ${filterClass}` : 'SEMUA KELAS'}
              </p>
           </div>
           
           <table className="w-full text-left border-collapse border border-slate-400">
             <thead>
               <tr className="bg-slate-100">
                 <th className="border border-slate-400 p-2 font-bold text-center">No</th>
                 <th className="border border-slate-400 p-2 font-bold">NIS / NISN</th>
                 <th className="border border-slate-400 p-2 font-bold">Nama Lengkap</th>
                 <th className="border border-slate-400 p-2 font-bold text-center">L/P</th>
                 <th className="border border-slate-400 p-2 font-bold text-center">Kelas</th>
                 <th className="border border-slate-400 p-2 font-bold text-center">Status</th>
               </tr>
             </thead>
             <tbody>
               {sortedStudents.length === 0 ? (
                 <tr><td colSpan={6} className="border border-slate-400 p-4 text-center">Tidak ada data</td></tr>
               ) : (
                 sortedStudents.map((s, idx) => (
                   <tr key={s.id}>
                     <td className="border border-slate-400 p-2 text-center">{idx + 1}</td>
                     <td className="border border-slate-400 p-2">{s.nis} {s.nisn ? `/ ${s.nisn}` : ''}</td>
                     <td className="border border-slate-400 p-2">{s.name}</td>
                     <td className="border border-slate-400 p-2 text-center">{s.gender}</td>
                     <td className="border border-slate-400 p-2 text-center">{s.class}</td>
                     <td className="border border-slate-400 p-2 text-center">{s.status === 'Pindah' ? 'Mutasi' : s.status}</td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
           
           <div className="mt-16 w-full flex justify-end">
             <div className="text-center">
                <p className="mb-16 text-right">.................., {new Date().toLocaleDateString('id-ID')}</p>
                <p className="font-semibold text-right">( Administrasi Sekolah )</p>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
