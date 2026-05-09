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
