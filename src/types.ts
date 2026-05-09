export interface Student {
  id: string;
  nis: string;
  nisn?: string;
  name: string;
  class: string; // 1A-6C
  gender: 'L' | 'P';
  dob: string;
  address: string;
  parentName: string;
  status: 'Aktif' | 'Lulus' | 'Pindah' | 'Keluar';
  ijazahNo?: string;
  ijazahUrl?: string;
  berkasUrl?: string;
  kkUrl?: string;
  akteUrl?: string;
  fotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  scriptUrl: string;
  folderId?: string;
  appName?: string;
}

export interface AppState {
  isAuthenticated: boolean;
  students: Student[];
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  setStudents: (students: Student[]) => void;
  addStudent: (student: Student) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  updateStudentsBulk: (updates: {id: string, data: Partial<Student>}[]) => void;
  deleteStudent: (id: string) => void;
  setSettings: (settings: Settings) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
