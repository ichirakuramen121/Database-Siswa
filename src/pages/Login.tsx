import React, { useState } from 'react';
import { useStore } from '../store';
import { Users, Lock, User } from 'lucide-react';

export default function Login() {
  const { login, settings } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const appName = settings?.appName || 'EduConnect';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctUsername = settings?.adminUsername || 'admin';
    const correctPassword = settings?.adminPassword || 'admin';
    
    if (username === correctUsername && password === correctPassword) {
      setIsLoggingIn(true);
      setTimeout(() => {
        setIsLoggingIn(false);
        login();
      }, 1000);
    } else {
      setError('Username atau password salah');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#e0e7ff] via-[#f3e8ff] to-[#fce7f3] flex items-center justify-center p-4 sm:p-6 font-sans text-gray-800">
      <div className="w-full max-w-4xl bg-white/60 backdrop-blur-2xl rounded-[2rem] border border-white/90 shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Konten Selamat Datang (Sisi Kiri di Desktop) */}
        <div className="hidden md:flex md:w-1/2 bg-indigo-600 text-white p-10 flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg mb-8 border border-white/30 overflow-hidden">
              {settings?.schoolLogoUrl ? (
                <img src={settings.schoolLogoUrl} alt="Logo" className="w-full h-full object-cover bg-white" referrerPolicy="no-referrer" />
              ) : (
                <Users className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tight leading-tight">Selamat Datang di<br/>{appName}</h1>
            <p className="text-indigo-100/80 text-lg leading-relaxed">
              Sistem Informasi Siswa terpadu untuk kemudahan manajemen data absensi, nilai, dan rekam jejak akademik.
            </p>
          </div>
          
          <div className="relative z-10 mt-12 bg-black/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
             <p className="text-sm italic text-indigo-100">
               "Pendidikan adalah senjata paling mematikan di dunia, karena dengan pendidikan, Anda dapat mengubah dunia."
             </p>
             <p className="text-xs font-bold mt-2 text-indigo-200">— Nelson Mandela</p>
          </div>
          
          {/* Ornamen Dekoratif Latar Belakang */}
          <div className="absolute top-[-20%] left-[-10%] w-72 h-72 bg-white flex-shrink-0 blur-[100px] opacity-20 rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-60 h-60 bg-blue-400 flex-shrink-0 blur-[80px] opacity-30 rounded-full"></div>
        </div>

        {/* Form Login (Sisi Kanan di Desktop) */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-center">
          <div className="flex flex-col items-center justify-center mb-8 md:hidden">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4 overflow-hidden">
              {settings?.schoolLogoUrl ? (
                <img src={settings.schoolLogoUrl} alt="Logo" className="w-full h-full object-cover bg-white" referrerPolicy="no-referrer" />
              ) : (
                <Users className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-indigo-900">{appName}</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Sistem Informasi Siswa</p>
          </div>

          <div className="hidden md:block mb-8">
            <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">Login Akun</h2>
            <p className="text-gray-500 font-medium mt-1">Silakan masuk menggunakan kredensial Anda.</p>
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
                    disabled={isLoggingIn}
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
                    disabled={isLoggingIn}
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isLoggingIn} className="w-full btn mt-4 justify-center py-3 text-base sm:text-lg">
              {isLoggingIn ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Memuat...
                </>
              ) : 'Masuk Aplikasi'}
            </button>
          </form>
          
          <div className="mt-8 text-center text-xs sm:text-sm text-gray-500">
            <p>Silakan gunakan kredensial yang telah diatur (Default: <strong>admin</strong> / <strong>admin</strong>)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
