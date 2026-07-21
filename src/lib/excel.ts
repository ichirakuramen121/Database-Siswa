import * as XLSX from 'xlsx';
import { Student } from '../types';
import { standardizeDate } from './utils';

export const exportToExcel = (students: Student[], filename: string = 'data-siswa.xlsx') => {
  const ws = XLSX.utils.json_to_sheet(students.map(s => ({
    "ID": s.id,
    "NIS": s.nis,
    "NISN": s.nisn || '-',
    "Nama Lengkap": s.name,
    "Kelas": s.class,
    "L/P": s.gender,
    "Tgl Lahir": s.dob,
    "Alamat": s.address,
    "Nama Orang Tua": s.parentName,
    "Status": s.status === 'Pindah' ? 'Mutasi' : s.status,
    "No Ijazah": s.ijazahNo || '-',
    "Link Ijazah": s.ijazahUrl || '-',
    "Link Berkas": s.berkasUrl || '-',
  })));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  XLSX.writeFile(wb, filename);
};

export const exportTeachersToExcel = (teachers: any[], filename: string = 'data-guru.xlsx') => {
  const ws = XLSX.utils.json_to_sheet(teachers.map((t, idx) => ({
    "No": idx + 1,
    "NIP": t.nip || '-',
    "Nama Lengkap": t.name,
    "L/P": t.gender,
    "Wali Kelas": t.class === 'None' ? '-' : t.class,
    "No Telepon": t.phone || '-',
    "Email": t.email || '-',
    "Status": t.status,
  })));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Guru");
  XLSX.writeFile(wb, filename);
};

export const importFromExcel = (file: File): Promise<Partial<Student>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const mapped = json.map(row => {
          let statusRaw = String(row['Status'] || 'Aktif').trim();
          let parsedStatus = 'Aktif';
          if (statusRaw.toLowerCase().includes('lulus')) parsedStatus = 'Lulus';
          else if (statusRaw.toLowerCase().includes('pindah') || statusRaw.toLowerCase().includes('mutasi')) parsedStatus = 'Pindah';
          else if (statusRaw.toLowerCase().includes('keluar')) parsedStatus = 'Keluar';

          // Fuzzy match for dob/tgl lahir header
          const dobKey = Object.keys(row).find(k => {
            const kl = k.toLowerCase();
            return kl.includes('tgl') || kl.includes('tanggal') || kl.includes('dob') || kl.includes('lahir');
          });
          const dobRaw = dobKey ? row[dobKey] : (row['Tgl Lahir'] || '');

          return {
            nis: String(row['NIS'] || row['Nis'] || ''),
            nisn: String(row['NISN'] || row['Nisn'] || ''),
            name: row['Nama Lengkap'] || row['Nama'] || '',
            class: row['Kelas'] || '',
            gender: String(row['L/P'] || row['Gender'] || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
            dob: standardizeDate(dobRaw),
            address: row['Alamat'] || '',
            parentName: row['Nama Orang Tua'] || '',
            status: parsedStatus,
            ijazahNo: row['No Ijazah'] && row['No Ijazah'] !== '-' ? String(row['No Ijazah']) : undefined,
          } as Partial<Student>;
        });

        resolve(mapped);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};
