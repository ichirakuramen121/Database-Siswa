import { useState } from 'react';
import { useStore } from '../store';
import { Users, Lock, User } from 'lucide-react';

export default function Login() {
  const { login } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      login();
    } else {
      setError('Username atau password salah');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#e0e7ff] via-[#f3e8ff] to-[#fce7f3] flex items-center justify-center p-4 sm:p-6 font-sans text-gray-800">
      <div className="w-full max-w-md bg-white/60 backdrop-blur-2xl rounded-[2rem] border border-white/90 shadow-2xl overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-indigo-900">EduConnect</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Sistem Informasi Siswa</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-3 bg-rose-100 border border-rose-200 text-rose-600 text-sm rounded-xl font-medium text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="relative">
              <label className="label">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-3 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username" 
                  className="input pl-11"
                  required
                />
              </div>
            </div>
            
            <div className="relative">
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3 text-gray-400 w-5 h-5" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password" 
                  className="input pl-11"
                  required
                />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full btn mt-4 justify-center py-3 text-base sm:text-lg">
            Masuk Aplikasi
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs sm:text-sm text-gray-500">
          <p>Gunakan user: <strong>admin</strong> dan password: <strong>admin</strong></p>
        </div>
      </div>
    </div>
  );
}
