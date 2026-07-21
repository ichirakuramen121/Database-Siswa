import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { CLASSES, matchClass, matchStatusActive } from '../lib/utils';
import { Printer, Filter, Calendar as CalendarIcon, FileSpreadsheet } from 'lucide-react';

export default function AttendancePrint() {
  const { students } = useStore();
  const [selectedClass, setSelectedClass] = useState<string>(CLASSES[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i);

  // Active students for selected class
  const classStudents = useMemo(() => {
    if (!students) return [];
    return students
      .filter(s => {
        if (!s) return false;
        return matchStatusActive(s.status) && matchClass(s.class, selectedClass);
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id'));
  }, [students, selectedClass]);

  // Calculate days in selected month (excluding Sundays optionally, but let's just create generic columns for all days for simplicity, or 31 fixed cols)
  // According to standard school attendance, we usually have up to 31 days.
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dayColumns = Array.from({length: daysInMonth}, (_, i) => i + 1);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-indigo-900">Cetak Daftar Hadir</h2>
          <p className="text-gray-500 mt-1 font-medium">Cetak format absen manual/checklist untuk guru kelas.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white/40 p-4 rounded-3xl border border-white/60 shadow-sm backdrop-blur-md no-print">
        <div className="flex gap-2 w-full flex-wrap">
          <div className="relative shrink-0 flex-1 min-w-[150px]">
            <Filter className="absolute left-4 top-3.5 text-gray-400" size={18} />
            <select 
              className="w-full bg-white/60 backdrop-blur-lg border border-white/80 px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-11 appearance-none font-medium text-gray-700"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {CLASSES.map(c => <option key={c} value={c}>Kelas {c}</option>)}
            </select>
          </div>
          
          <div className="relative shrink-0 flex-1 min-w-[150px]">
            <CalendarIcon className="absolute left-4 top-3.5 text-gray-400" size={18} />
            <select 
              className="w-full bg-white/60 backdrop-blur-lg border border-white/80 px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-11 appearance-none font-medium text-gray-700"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {months.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
            </select>
          </div>

          <div className="relative shrink-0 flex-1 min-w-[120px]">
             <select 
              className="w-full bg-white/60 backdrop-blur-lg border border-white/80 px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 appearance-none font-medium text-gray-700"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button onClick={handlePrint} className="btn justify-center w-full md:w-auto shrink-0 flex-1 min-w-[150px]">
            <Printer className="mr-2" size={18} /> Cetak Daftar Hadir
          </button>
        </div>
      </div>

      {classStudents.length === 0 ? (
        <div className="bg-white/70 p-12 rounded-[2rem] border border-white/90 shadow-sm text-center no-print">
           <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
           <h3 className="text-xl font-bold text-gray-700">Tidak ada siswa aktif di Kelas {selectedClass}</h3>
           <p className="text-gray-500 mt-2">Silakan tambahkan siswa terlebih dahulu.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto p-4 md:p-8 print:shadow-none print:border-none print:p-0 print:overflow-visible">
          <div className="printable-container min-w-[900px] print:min-w-0">
            
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold uppercase mb-1">Daftar Hadir Siswa</h1>
              <h2 className="text-lg font-bold">Bulan: {months[selectedMonth]} {selectedYear} &nbsp;&nbsp;&nbsp;&nbsp; Kelas: {selectedClass}</h2>
            </div>

            <table className="w-full text-sm text-left border-collapse border border-black print-table">
              <thead>
                <tr>
                  <th rowSpan={2} className="border border-black p-2 text-center w-8">No</th>
                  <th rowSpan={2} className="border border-black p-2 w-24">NIS/NISN</th>
                  <th rowSpan={2} className="border border-black p-2 w-48">Nama Lengkap</th>
                  <th rowSpan={2} className="border border-black p-2 text-center w-8">L/P</th>
                  <th colSpan={daysInMonth} className="border border-black p-1 text-center">Tanggal</th>
                  <th colSpan={3} className="border border-black p-1 text-center">Keterangan</th>
                </tr>
                <tr>
                  {dayColumns.map(d => (
                    <th key={d} className="border border-black p-1 text-center min-w-[20px] text-[10px] w-5">{d}</th>
                  ))}
                  <th className="border border-black p-1 text-center w-6 text-xs">S</th>
                  <th className="border border-black p-1 text-center w-6 text-xs">I</th>
                  <th className="border border-black p-1 text-center w-6 text-xs">A</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="border border-black p-1 text-center font-medium">{idx + 1}</td>
                    <td className="border border-black p-1 text-xs">{s.nis}{s.nisn ? ` / ${s.nisn}` : ''}</td>
                    <td className="border border-black p-1 font-medium max-w-[200px] truncate">{s.name}</td>
                    <td className="border border-black p-1 text-center">{s.gender}</td>
                    {dayColumns.map(d => (
                      <td key={d} className="border border-black p-1"></td>
                    ))}
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between mt-12 px-8">
              <div className="text-center">
                <p className="mb-20">Mengetahui,<br/>Kepala Sekolah</p>
                <p className="font-bold underline">_________________________</p>
                <p>NIP. </p>
              </div>
              <div className="text-center">
                <p className="mb-20">...................., .................... {selectedYear}<br/>Guru Kelas {selectedClass}</p>
                <p className="font-bold underline">_________________________</p>
                <p>NIP. </p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
