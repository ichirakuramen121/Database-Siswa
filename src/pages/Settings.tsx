import { useStore } from '../store';
import { Save, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { GAS_TEMPLATE } from '../lib/constants';

export default function Settings() {
  const { settings, setSettings } = useStore();
  const [url, setUrl] = useState(settings.scriptUrl);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    setSettings({ ...settings, scriptUrl: url });
    alert("Pengaturan Berhasil Disimpan!");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(GAS_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-indigo-900">Pengaturan</h2>
        <p className="text-gray-500 mt-1 font-medium">Konfigurasi database dengan Google Apps Script.</p>
      </div>

      <div className="bg-white/70 backdrop-blur-2xl p-5 sm:p-8 rounded-3xl sm:rounded-[2rem] border border-white/90 shadow-lg">
        <h3 className="text-xl font-bold mb-6 text-indigo-900">Integrasi Google Sheets & Drive</h3>
        
        <div className="space-y-4">
          <div>
            <label className="label">Google Apps Script Web App URL</label>
            <input 
              type="text" 
              className="input w-full text-sm sm:text-base" 
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <button onClick={handleSave} className="btn w-full sm:w-auto">
            <Save size={18} />
            Simpan Konfigurasi
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-white/40">
          <h4 className="font-semibold text-indigo-900 mb-3 text-lg">Panduan Instalasi Script</h4>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 mb-6 leading-relaxed">
            <li>Buat Google Spreadsheet baru di Google Drive Anda.</li>
            <li>Klik menu <strong>Ekstensi</strong> {'>'} <strong>Apps Script</strong>.</li>
            <li>Hapus semua kode yang ada, copy paste kode di bawah ini <b>(Pastikan menyalin ulang karena ada tambahan NISN)</b>.</li>
            <li>Klik tombol <strong>Simpan</strong> (ikon Disket).</li>
            <li>Klik tombol biru <strong>Terapkan (Deploy)</strong> {'>'} <strong>Deployment Baru</strong>.</li>
            <li>Pilih Jenis <strong>Aplikasi Web (Web App)</strong>.</li>
            <li>Atur Akses {'>'} Jalankan sebagai: <strong>Saya (Me)</strong>, Siapa yang memiliki akses: <strong>Siapa saja (Anyone)</strong>.</li>
            <li>Klik Terapkan. Kemudian setujui perizinan Google jika diminta (Lanjutan {'>'} Buka).</li>
            <li>Copy URL Web App dan paste di form atas.</li>
          </ol>

          <div className="relative">
            <button 
              onClick={handleCopy}
              className="absolute top-2 right-2 p-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-sm overflow-auto h-96">
              <code>{GAS_TEMPLATE}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
