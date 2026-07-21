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
  if (!value) return '';
  
  // If it's already a Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // If it's a number (likely Excel serial number)
  if (typeof value === 'number') {
    // Excel base date is Dec 30, 1899 (due to Leap Year Bug)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  let str = String(value).trim();
  if (!str || str === '-') return '';

  // If it is an ISO/JSON serialized date e.g. "2019-06-03T17:00:00.000Z"
  if (str.includes('T')) {
    const datePart = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }
  }

  // If it is exactly YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Handle formats like DD-MM-YYYY or DD/MM/YYYY or D/M/YYYY
  const dmYMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmYMatch) {
    const day = dmYMatch[1].padStart(2, '0');
    const month = dmYMatch[2].padStart(2, '0');
    const year = dmYMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Handle formats like MM-DD-YYYY or MM/DD/YYYY (US formats)
  // We can attempt parsing using native Date and carefully extracting components
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
  if (!cleanDate) return dateString;
  try {
    const d = new Date(cleanDate);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

export function calculateAge(dobString: string | null | undefined): { years: number; months: number } | null {
  if (!dobString) return null;
  try {
    const birthDate = new Date(dobString);
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
  // Convert Google Drive sharing link to a direct image endpoint that bypasses restrictions
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

