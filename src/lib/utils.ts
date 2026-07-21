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

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
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

