import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export const CLASSES = [];
for (let i = 1; i <= 6; i++) {
  CLASSES.push(`${i}A`, `${i}B`, `${i}C`);
}

export const STATUSES = ["Aktif", "Lulus", "Pindah", "Keluar"]; // Pindah represents mutasi

export function standardizeDate(value: any): string {
  if (value === null || value === undefined) return '';
  
  // If it's a JavaScript Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    // If the date object represents local midnight (e.g. new Date(2019, 5, 4))
    // use local date getters to prevent timezone shifts.
    let y: number, m: number, d: number;
    if (value.getHours() === 0 && value.getMinutes() === 0 && value.getSeconds() === 0) {
      y = value.getFullYear();
      m = value.getMonth() + 1;
      d = value.getDate();
    } else {
      y = value.getUTCFullYear();
      m = value.getUTCMonth() + 1;
      d = value.getUTCDate();
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // If it's a number or numeric string (likely Excel serial number e.g. 43620)
  if (
    typeof value === 'number' ||
    (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim()) && Number(value) > 1000 && Number(value) < 100000)
  ) {
    const num = Number(value);
    // Excel base epoch: Dec 30, 1899 (compensates for 1900 leap year bug)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + Math.round(num) * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  let str = String(value).trim();
  if (!str || str === '-') return '';

  // Handle ISO / timestamp strings with time e.g. "2019-06-04T00:00:00.000Z" or "2019-06-04 00:00:00"
  if (str.includes('T') || str.includes(' ')) {
    const datePart = str.split(/[T ]/)[0];
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(datePart) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(datePart)) {
      str = datePart;
    }
  }

  // 1. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY (Indonesian format)
  const dmYMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmYMatch) {
    const day = dmYMatch[1].padStart(2, '0');
    const month = dmYMatch[2].padStart(2, '0');
    let year = dmYMatch[3];
    if (year.length === 2) {
      const yNum = parseInt(year, 10);
      year = yNum > 30 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  // Fallback native date parsing
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch (e) {
    // fallback
  }

  return str;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const cleanDate = standardizeDate(dateString);
  if (!cleanDate) return String(dateString);

  try {
    const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      // Create local date object explicitly to avoid UTC timezone offset shifts
      const d = new Date(year, month, day);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }

    const d = new Date(cleanDate);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return String(dateString);
  }
}

export function calculateAge(dobString: string | null | undefined): { years: number; months: number } | null {
  if (!dobString) return null;
  const cleanDate = standardizeDate(dobString);
  if (!cleanDate) return null;

  try {
    let birthDate: Date;
    const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      birthDate = new Date(year, month, day);
    } else {
      birthDate = new Date(cleanDate);
    }
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return { years, months };
  } catch (e) {
    return null;
  }
}

export function formatAge(dobString: string | null | undefined): string {
  const age = calculateAge(dobString);
  if (!age) return '-';
  return `${age.years} tahun ${age.months} bulan`;
}

export function getGoogleDriveDirectImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  const cleanUrl = String(url).trim().replace(/['"]/g, '');
  if (cleanUrl.startsWith('data:image')) return cleanUrl;

  let id = '';
  const fileDMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    id = fileDMatch[1];
  } else {
    const idMatch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      id = idMatch[1];
    }
  }

  if (id) {
    return `https://lh3.googleusercontent.com/d/${id}`;
  }
  return cleanUrl;
}

export function getGoogleDriveThumbnailUrl(url: string | null | undefined): string {
  if (!url) return '';
  const cleanUrl = String(url).trim().replace(/['"]/g, '');
  if (cleanUrl.startsWith('data:image')) return cleanUrl;

  let id = '';
  const fileDMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    id = fileDMatch[1];
  } else {
    const idMatch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      id = idMatch[1];
    }
  }

  if (id) {
    return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  }
  return cleanUrl;
}

export function matchClass(studentClass: string | null | undefined, targetClass: string | null | undefined): boolean {
  if (!studentClass || !targetClass) return false;
  
  // Clean target: e.g. "1A" -> "1A"
  const cleanTarget = String(targetClass).replace(/\s+/g, '').toUpperCase();
  
  // Clean student class: e.g. "Kelas 1A" -> "1A", "Kelas 1-A" -> "1A", "1-A" -> "1A"
  const cleanStudent = String(studentClass)
    .toUpperCase()
    .replace(/KELAS/g, '')
    .replace(/[-_]/g, '')
    .replace(/\s+/g, '');
    
  return cleanStudent === cleanTarget;
}

export function matchStatusActive(status: string | null | undefined): boolean {
  if (!status) return false;
  const cleanStatus = String(status).trim().toLowerCase();
  return cleanStatus === 'aktif';
}

export function getActiveClasses(students: any[]): string[] {
  if (!students || !Array.isArray(students) || students.length === 0) return CLASSES;
  const set = new Set<string>();
  students.forEach(s => {
    if (s && matchStatusActive(s.status) && s.class) {
      const clean = String(s.class).trim().toUpperCase().replace(/^KELAS\s*/i, '');
      if (clean) set.add(clean);
    }
  });
  if (set.size === 0) return CLASSES;
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

export function getAllClasses(students: any[]): string[] {
  if (!students || !Array.isArray(students) || students.length === 0) return CLASSES;
  const set = new Set<string>();
  students.forEach(s => {
    if (s && s.class) {
      const clean = String(s.class).trim().toUpperCase().replace(/^KELAS\s*/i, '');
      if (clean) set.add(clean);
    }
  });
  CLASSES.forEach(c => set.add(c));
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

