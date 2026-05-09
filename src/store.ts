import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Student, Settings } from './types';

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      students: [],
      settings: { scriptUrl: '' },
      isLoading: false,
      error: null,
      login: () => set({ isAuthenticated: true }),
      logout: () => set({ isAuthenticated: false }),
      setStudents: (students) => set({ students, error: null }),
      addStudent: (student) => set((state) => ({ students: [...state.students, student] })),
      updateStudent: (id, data) =>
        set((state) => ({
          students: state.students.map((s) => (s.id === id ? { ...s, ...data } : s)),
        })),
      deleteStudent: (id) =>
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
        })),
      setSettings: (settings) => set({ settings }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'sis-storage',
    }
  )
);
